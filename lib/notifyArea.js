// lib/notifyArea.js
//
// 新規投稿（困りごと・里親募集・ボランティア募集）に都道府県が設定されている場合、
// 同じデフォルト地域を設定していてエリア新着通知をONにしているユーザーへ
// 通知するAPI（/api/push/notify-area）を呼び出す共通ヘルパー。
// 失敗しても投稿自体は成功させるため、呼び出し元では結果を待たなくてよい
// （fire-and-forget。エラーは握りつぶす）。
import { supabase } from "./supabase"

export async function notifyArea(table, id) {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token
    if (!accessToken) return
    fetch("/api/push/notify-area", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ table, id }),
    }).catch(() => {})
  } catch (e) {
    // 通知送信の失敗は投稿自体に影響させない
  }
}
