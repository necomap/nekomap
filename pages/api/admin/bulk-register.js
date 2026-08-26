// 管理者による代行登録API（サーバー側専用）
//
// 背景: これまでBulkRegister.jsはブラウザ上で supabase.auth.signUp() を
//   直接呼んでいたが、これはアプリ全体で共有している同じSupabaseクライアント
//   （＝今ログインしている管理者自身のセッション）を使って新規ユーザーを
//   作成してしまうため、新しいアカウントに向けてセッションが上書きされ、
//   管理者自身が気づかないうちにログアウトされてしまう不具合があった。
//
//   代理登録のような「他人のアカウントをログインせずに作る」処理は、
//   ブラウザ側ではなく、サービスロールキー（秘密鍵。絶対に
//   NEXT_PUBLIC_を付けず、ブラウザに渡らないようにする）を使った
//   サーバー側APIで行う必要がある。
//
// 事前準備（このAPIを使う前に一度だけ）:
//   1. Supabaseダッシュボード → Project Settings → API → 「service_role」キーをコピー
//   2. .env.local に SUPABASE_SERVICE_ROLE_KEY=（コピーした値） を追加
//   3. Vercelの環境変数にも同じキーを SUPABASE_SERVICE_ROLE_KEY として追加
//      （Production/Preview/Development すべてにチェック）
//   4. 追加後、開発サーバーの再起動 / Vercelの再デプロイが必要

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
  const { email, password, nickname, name, organization, website, accountType } = req.body || {}
  if (!email || !password || !nickname) {
    return res.status(400).json({ error: "メールアドレス・パスワード・ニックネームは必須です" })
  }

  // 3. サービスロールで新規ユーザーを作成（管理者自身のセッションには一切影響しない）
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (createError) {
    return res.status(400).json({ error: "登録エラー: " + createError.message })
  }

  const { error: insertError } = await adminClient.from("users").insert({
    id: created.user.id,
    email, nickname, name,
    organization: organization || null,
    website: website || null,
    account_type: accountType || "activist",
    role: "user",
  })
  if (insertError) {
    return res.status(400).json({ error: "プロフィール保存に失敗しました: " + insertError.message })
  }

  return res.status(200).json({ ok: true })
}
