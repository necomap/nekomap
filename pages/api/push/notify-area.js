// エリア新着通知API（サーバー側専用） - 同じデフォルト地域を設定していて
// オプトインしているユーザーへ、新しい投稿をプッシュ通知・メール通知する。
//
// 呼び出し元は、投稿者自身の認証情報をつけてPOSTする。
// 対応しているtable: trouble_reports / adoptions / volunteer_requests
// （掲示板投稿は対象外。困りごと・里親募集・ボランティア募集のみ）
//
// notification_preferences.area_new_post が true のユーザーにのみ送る
// （他の通知種別と異なり、これは「自分の投稿への反応」ではなく地域内の
// 新着というブロードキャスト的な通知のため、デフォルトOFF・オプトイン方式）
//
// 事前準備は pages/api/push/send.js と同じ（VAPID / Resend環境変数）。

import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"
import { Resend } from "resend"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const TABLE_INFO = {
  trouble_reports: { emoji: "⚠️", label: "困りごと報告", url: "/reports" },
  adoptions: { emoji: "🏠", label: "里親募集", url: "/adoption" },
  volunteer_requests: { emoji: "🙋", label: "ボランティア募集", url: "/volunteer" },
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  if (!serviceRoleKey) {
    return res.status(200).json({ ok: true, skipped: "not_configured" })
  }

  const authHeader = req.headers.authorization || ""
  const accessToken = authHeader.replace("Bearer ", "")
  if (!accessToken) {
    return res.status(401).json({ error: "ログインが必要です" })
  }

  const { table, id } = req.body || {}
  const info = TABLE_INFO[table]
  if (!info || !id) {
    return res.status(400).json({ error: "table/idが不正です" })
  }

  const anonClient = createClient(supabaseUrl, anonKey)
  const { data: callerData, error: callerError } = await anonClient.auth.getUser(accessToken)
  if (callerError || !callerData.user) {
    return res.status(401).json({ error: "認証情報が無効です" })
  }
  const senderId = callerData.user.id
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // 本当にその投稿の投稿者からの呼び出しかを確認する（乱用防止）
  const { data: row } = await adminClient
    .from(table)
    .select("id, created_by, prefecture" + (table === "adoptions" ? ", name" : table === "volunteer_requests" ? ", title" : ", type, description"))
    .eq("id", id)
    .single()

  if (!row || row.created_by !== senderId || !row.prefecture) {
    return res.status(200).json({ ok: true, sent: 0 })
  }

  const title = `${info.emoji} ${row.prefecture}で新しい${info.label}があります`
  const body =
    table === "adoptions" ? row.name || "" :
    table === "volunteer_requests" ? row.title || "" :
    (row.description || row.type || "").slice(0, 80)
  const url = table === "adoptions" || table === "volunteer_requests" ? `${info.url}` : info.url

  // 同じデフォルト地域を設定していて、area_new_post通知をONにしているユーザーを取得
  const { data: recipients } = await adminClient
    .from("users")
    .select("id, email, notification_preferences, email_notifications_enabled")
    .eq("default_prefecture", row.prefecture)
    .neq("id", senderId)

  const targets = (recipients || []).filter((r) => r.notification_preferences?.area_new_post === true)
  if (targets.length === 0) {
    return res.status(200).json({ ok: true, sent: 0 })
  }

  let pushSent = 0
  let emailSent = 0

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@example.com",
      vapidPublicKey,
      vapidPrivateKey
    )
  }
  const resendApiKey = process.env.RESEND_API_KEY
  const resend = resendApiKey ? new Resend(resendApiKey) : null
  const siteUrl = process.env.SITE_URL || "https://neko-map-app.vercel.app"

  await Promise.all(
    targets.map(async (recipient) => {
      if (vapidPublicKey && vapidPrivateKey) {
        const { data: subscriptions } = await adminClient
          .from("push_subscriptions").select("*").eq("user_id", recipient.id)
        if (subscriptions && subscriptions.length > 0) {
          const payload = JSON.stringify({ title, body, url })
          await Promise.all(
            subscriptions.map(async (sub) => {
              try {
                await webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  payload
                )
                pushSent++
              } catch (e) {
                if (e.statusCode === 404 || e.statusCode === 410) {
                  await adminClient.from("push_subscriptions").delete().eq("id", sub.id)
                }
              }
            })
          )
        }
      }

      if (resend && recipient.email_notifications_enabled && recipient.email) {
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "NekoMap <onboarding@resend.dev>",
            to: recipient.email,
            subject: title,
            text: `${body}\n\n詳しくはこちら: ${siteUrl}${url}\n\n※この通知は、プロフィール編集画面の「エリア新着通知」設定をONにしている方に送信されています。`,
          })
          emailSent++
        } catch (e) {
          console.error("エリア通知メール送信エラー:", e.message)
        }
      }
    })
  )

  return res.status(200).json({ ok: true, sent: pushSent, email: emailSent, targets: targets.length })
}
