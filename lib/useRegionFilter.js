// lib/useRegionFilter.js
//
// 一覧ページ（困りごと・里親募集・ボランティア募集・掲示板）で使う
// 「表示する地域（都道府県）」の判定ロジック。
//
// 優先順位:
//   1. このブラウザ・このタブでの一時的な変更（sessionStorage）
//   2. ログイン中ならアカウントのデフォルト地域（users.default_prefecture）
//   3. 現在地から自動判定（ブラウザの位置情報→逆geocode。結果はセッション中キャッシュ）
//   4. 判定できなければ「全国」（絞り込みなし）
//
// region の値: null = 判定中（読み込み中）, "" = 全国, "東京都" 等 = その都道府県に絞り込み中
import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import { reverseGeocodeToPrefecture } from "./geocode"

const OVERRIDE_KEY = "nekomap_region_override"
const AUTO_CACHE_KEY = "nekomap_region_auto"

export function useRegionFilter() {
  const [region, setRegion] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      // 1. 一時的な変更があれば最優先
      try {
        const override = sessionStorage.getItem(OVERRIDE_KEY)
        if (override !== null) {
          if (!cancelled) { setRegion(override); setLoading(false) }
          return
        }
      } catch {
        // sessionStorageが使えない環境（プライベートモード等）は無視して次へ
      }

      // 2. ログイン中ならアカウントのデフォルト地域
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        const { data: profile } = await supabase
          .from("users").select("default_prefecture").eq("id", userData.user.id).single()
        if (profile?.default_prefecture) {
          if (!cancelled) { setRegion(profile.default_prefecture); setLoading(false) }
          return
        }
      }

      // 3. 現在地から自動判定（セッション中は再判定しない）
      try {
        const cached = sessionStorage.getItem(AUTO_CACHE_KEY)
        if (cached !== null) {
          if (!cancelled) { setRegion(cached); setLoading(false) }
          return
        }
      } catch {
        // 無視
      }

      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const pref = await reverseGeocodeToPrefecture(pos.coords.latitude, pos.coords.longitude)
            if (cancelled) return
            try { sessionStorage.setItem(AUTO_CACHE_KEY, pref || "") } catch {}
            setRegion(pref || "")
            setLoading(false)
          },
          () => {
            if (!cancelled) { setRegion(""); setLoading(false) }
          },
          { timeout: 5000 }
        )
      } else {
        if (!cancelled) { setRegion(""); setLoading(false) }
      }
    }

    resolve()
    return () => { cancelled = true }
  }, [])

  function changeRegion(pref) {
    try { sessionStorage.setItem(OVERRIDE_KEY, pref) } catch {}
    setRegion(pref)
  }

  return { region, loading, changeRegion }
}

// 一覧データをregionで絞り込む共通関数。
// item.prefecture が未設定（位置情報なしの投稿等）の場合は、
// 絞り込み対象外として常に表示する。
export function filterByRegion(items, region) {
  if (!region) return items
  return items.filter((item) => !item.prefecture || item.prefecture === region)
}
