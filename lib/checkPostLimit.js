import { supabase } from "./supabase"

export async function checkPostLimit(tableName) {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, message: "ログインが必要です" }

  const { data, error } = await supabase.rpc("check_post_limit", {
    user_id: userData.user.id,
    table_name: tableName,
  })

  if (error) {
    // エラー時は投稿をブロックしない（一時的な通信エラー等でユーザーを
    // 締め出さないため）が、check_post_limit関数が壊れている/存在しない
    // ことに気づけるよう、ログには必ず残す。
    console.error("投稿数チェックに失敗しました（制限なしで続行します）:", error.message)
    return { ok: true }
  }
  if (!data) return { ok: false, message: "本日の投稿上限（5件）に達しました。明日またお試しください。" }

  return { ok: true }
}