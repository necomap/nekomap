// チーム招待メール送信API（サーバー側専用）
// 招待レコード自体はブラウザ側（RLS経由）で作成済み。このAPIはメール送信のみを行う。
// メール送信に失敗しても、招待リンク自体は画面に表示されるため致命的ではない。

import { Resend } from "resend"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { email, link, orgName } = req.body || {}
  if (!email || !link) {
    return res.status(400).json({ error: "email/linkが不正です" })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return res.status(200).json({ ok: true, skipped: "not_configured" })
  }

  try {
    const resend = new Resend(resendApiKey)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "NekoMap <onboarding@resend.dev>",
      to: email,
      subject: `「${orgName || "チーム"}」への招待 - NekoMap`,
      text: `NekoMapの「${orgName || "チーム"}」に招待されました。\n\n下記リンクから参加できます（有効期限7日間）:\n${link}\n\n※心当たりがない場合はこのメールを無視してください。`,
    })
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error("招待メール送信エラー:", e.message)
    return res.status(200).json({ ok: false, error: e.message })
  }
}
