// 管理者による猫の代行一括登録API（サーバー側専用）
//
// 背景: 忙しい保護団体が何十頭もの猫を登録するのは大変なため、
//   管理者が団体アカウントの代わりに猫をまとめて登録できるようにする。
//   bulk-register.js（ユーザーアカウントの代行登録）とは別の機能で、
//   こちらは「既存の団体・活動者アカウントに紐づく猫のレコード」を
//   まとめて作成する。
//
//   通常、猫の新規登録（/cats/new）はログイン中の本人が
//   created_by = 自分のid で登録する形になっているが、管理者が
//   代わりに登録する場合は created_by を「対象の団体アカウントのid」に
//   する必要がある。ブラウザ側から直接それを行うと、管理者自身の
//   IDでしか登録できない（RLSで他人のidをcreated_byにしたinsertは
//   拒否される）ため、bulk-register.jsと同様にサービスロールキーを
//   使ったサーバー側APIとして実装する。
//
// 事前準備: bulk-register.js と同じ（SUPABASE_SERVICE_ROLE_KEY が必要）

import { createClient } from "@supabase/supabase-js"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    return res.status(500).json({
      error: "サーバー側にSUPABASE_SERVICE_ROLE_KEYが設定されていません。管理者に設定を依頼してください。",
    })
  }

  // 1. リクエストしてきたのが本当にログイン中の管理者かを確認する
  const authHeader = req.headers.authorization || ""
  const accessToken = authHeader.replace("Bearer ", "")
  if (!accessToken) {
    return res.status(401).json({ error: "ログインが必要です" })
  }

  const anonClient = createClient(supabaseUrl, anonKey)
  const { data: callerData, error: callerError } = await anonClient.auth.getUser(accessToken)
  if (callerError || !callerData.user) {
    return res.status(401).json({ error: "認証情報が無効です" })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: callerProfile } = await adminClient
    .from("users").select("role").eq("id", callerData.user.id).single()
  if (callerProfile?.role !== "admin") {
    return res.status(403).json({ error: "管理者のみ利用できます" })
  }

  // 2. 入力チェック
  const { targetUserId, cats } = req.body || {}
  if (!targetUserId) {
    return res.status(400).json({ error: "登録先の団体・活動者アカウントを選択してください" })
  }
  if (!Array.isArray(cats) || cats.length === 0) {
    return res.status(400).json({ error: "登録する猫の情報がありません" })
  }
  if (cats.length > 200) {
    return res.status(400).json({ error: "一度に登録できるのは200頭までです" })
  }

  const { data: targetUser } = await adminClient
    .from("users").select("id, nickname, organization").eq("id", targetUserId).single()
  if (!targetUser) {
    return res.status(400).json({ error: "登録先アカウントが見つかりません" })
  }

  // 3. 入力の整形とバリデーション（名前が空の行はスキップ）
  const rows = cats
    .map((c) => ({
      name: (c.name || "").trim(),
      features: (c.features || "").trim() || null,
      sex: (c.sex || "").trim() || null,
      neutered: !!c.neutered,
      notes: (c.notes || "").trim() || null,
      created_by: targetUserId,
    }))
    .filter((c) => c.name)

  if (rows.length === 0) {
    return res.status(400).json({ error: "名前が入力された猫が1頭もありません" })
  }

  const { data: inserted, error: insertError } = await adminClient
    .from("cats").insert(rows).select("id")

  if (insertError) {
    return res.status(400).json({ error: "登録に失敗しました: " + insertError.message })
  }

  return res.status(200).json({
    ok: true,
    inserted: inserted?.length || 0,
    skipped: cats.length - rows.length,
    targetUser: { nickname: targetUser.nickname, organization: targetUser.organization },
  })
}
