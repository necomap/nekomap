// lib/chatRoom.js
//
// 2人のユーザー間の1対1チャットルームを取得、なければ作成するユーティリティ。
// 掲示板の投稿者へのメッセージ機能などから使う。
import { supabase } from "./supabase"

function orFilter(userId, otherUserId) {
  return `and(user_a.eq.${userId},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${userId})`
}

/**
 * userId と otherUserId の1対1チャットルームIDを返す。
 * 既存の部屋があればそのID、無ければ新規作成してそのIDを返す。
 */
export async function getOrCreateDmRoom(userId, otherUserId) {
  const { data: existing, error: findError } = await supabase
    .from("chat_rooms")
    .select("id")
    .or(orFilter(userId, otherUserId))
    .maybeSingle()

  if (findError) throw findError
  if (existing?.id) return existing.id

  const { data: created, error: insertError } = await supabase
    .from("chat_rooms")
    .insert({ user_a: userId, user_b: otherUserId })
    .select("id")
    .single()

  if (!insertError) return created.id

  // 相手も同時に部屋を作ろうとして一意制約に引っかかった場合は、もう一度探す
  const { data: retry } = await supabase
    .from("chat_rooms")
    .select("id")
    .or(orFilter(userId, otherUserId))
    .maybeSingle()

  if (retry?.id) return retry.id
  throw insertError
}
