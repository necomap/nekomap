// チーム招待メール送信API（サーバー側専用）
//
// 【セキュリティ修正 2026-09-30】
// 以前はログイン確認が一切なく、クライアントから受け取ったemail・link・
// orgNameをそのままメール本文に使って送信していた。つまり誰でも
// （NekoMapにログインしていない第三者でも）このAPIに直接POSTすれば、
// 「NekoMapからの招待」という体裁のメールを、任意の宛先へ、任意のリンク
// （フィッシングサイト等）付きで送れてしまう状態だった
// （メール送信サービスを悪用した「なりすまし・フィッシングの踏み台」）。
//
// 対策: ログイン確認を必須にした上で、クライアントからはtoken（招待の
// トークン）のみを受け取り、宛先メールアドレス・チーム名・リンクは
// 必ずDBの実際の招待レコード（organization_invites）から取得し直す。
// クライアントが送ってきた文字列を、メール本文に直接使うことは一切ない。
// さらに、呼び出したユーザーが実際にその招待と同じチームのメンバーで
// あることも確認する（RLSの「チームメンバーが招待可能」と同じ条件）。

import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // 1. 呼び出し元が本当にログイン中のユーザーかを確認する
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

  if (!serviceRoleKey) {
    // メール送信は必須機能ではない（画面上にリンクが表示されるため）ので、
    // 未設定でもエラーにはしない
    return res.status(200).json({ ok: true, skipped: "not_configured" })
  }

  // 2. クライアントからはtokenのみを受け取る（email/link/orgNameは廃止）
  const { token } = req.body || {}
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "tokenが不正です" })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: invite } = await adminClient
    .from("organization_invites")
    .select("email, organization_id, status")
    .eq("token", token)
    .single()

  if (!invite || invite.status !== "pending" || !invite.email) {
    return res.status(404).json({ error: "招待が見つかりません" })
  }

  // 3. 呼び出したユーザーが、この招待と同じチームのメンバーであることを確認
  const { data: callerProfile } = await adminClient
    .from("users").select("organization_id").eq("id", callerData.user.id).single()
  if (!callerProfile?.organization_id || callerProfile.organization_id !== invite.organization_id) {
    return res.status(403).json({ error: "この招待を送信する権限がありません" })
  }

  const { data: org } = await adminClient
    .from("organizations").select("name").eq("id", invite.organization_id).single()

  // リンクも自前で組み立てる（クライアントから受け取ったlinkは使わない）
  const siteUrl = process.env.SITE_URL || "https://neko-map-app.vercel.app"
  const link = `${siteUrl}/org/join/${token}`

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return res.status(200).json({ ok: true, skipped: "not_configured" })
  }

  try {
    const resend = new Resend(resendApiKey)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "NekoMap <onboarding@resend.dev>",
      to: invite.email,
      subject: `「${org?.name || "チーム"}」への招待 - NekoMap`,
      text: `NekoMapの「${org?.name || "チーム"}」に招待されました。\n\n下記リンクから参加できます（有効期限7日間）:\n${link}\n\n※心当たりがない場合はこのメールを無視してください。`,
    })
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error("招待メール送信エラー:", e.message)
    return res.status(200).json({ ok: false, error: e.message })
  }
}
