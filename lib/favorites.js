// lib/favorites.js
//
// お気に入り（ブックマーク）機能の共通ヘルパー。
// favoritesテーブルは (user_id, target_table, target_id) の組でユニーク。
import { supabase } from "./supabase"

export const FAVORITABLE_TABLES = {
  trouble_reports: { label: "困りごと", path: "/reports" },
  adoptions: { label: "里親募集", path: "/adoption" },
  volunteer_requests: { label: "ボランティア募集", path: "/volunteer" },
  posts: { label: "掲示板", path: "/board" },
}

// 指定ユーザーの、指定テーブルにおけるお気に入りのtarget_id一覧をSetで返す
export async function loadFavoriteIds(userId, targetTable) {
  if (!userId) return new Set()
  const { data } = await supabase
    .from("favorites")
    .select("target_id")
    .eq("user_id", userId)
    .eq("target_table", targetTable)
  return new Set((data || []).map((f) => f.target_id))
}

// お気に入りのON/OFFを切り替える。切り替え後の状態（true=登録済み）を返す
export async function toggleFavorite(userId, targetTable, targetId, isFavorited) {
  if (!userId) throw new Error("ログインが必要です")
  if (isFavorited) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("target_table", targetTable)
      .eq("target_id", targetId)
    if (error) throw error
    return false
  } else {
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: userId, target_table: targetTable, target_id: targetId })
    if (error) throw error
    return true
  }
}
