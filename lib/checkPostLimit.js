import { supabase } from "./supabase"

export async function checkPostLimit(tableName) {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, message: "ログインが必要です" }

  const { data, error } = await supabase.rpc("check_post_limit", {
    user_id: userData.user.id,
    table_name: tableName,
  })

  if (error) return { ok: true } // エラー時は制限しない
  if (!data) return { ok: false, message: "本日の投稿上限（5件）に達しました。明日またお試しください。" }

  return { ok: true }
}