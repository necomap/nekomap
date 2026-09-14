// 通知送信API（サーバー側専用） - プッシュ通知 + メール通知
//
// 呼び出し元は、送信者自身の認証情報をつけてPOSTする。
// type ごとに「誰に」「何を」送るかを決め、受信者の通知設定
// （notification_preferences / email_notifications_enabled）を
// 確認したうえで、有効な経路（プッシュ購読がある／メール通知ON）
// にだけ送る。
//
// 対応しているtype:
//   "chat"             — チャット新着メッセージ { roomId, preview }
//   "memorial_report"  — 自分の猫への訃報報告   { catId, reason }
//   "trouble_response" — 困りごと投稿への対応   { reportId }
//
// 事前準備:
//   プッシュ通知: NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
//   メール通知  : RESEND_API_KEY（Resendのダッシュボードで取得）
//                 任意で RESEND_FROM_EMAIL（未設定時は onboarding@resend.dev を使用。
//                 これはResendの共有テスト送信元のため、独自ドメインを
//                 Resendで認証すれば、そのドメインのアドレスに変更できる）
//                 任意で SITE_URL（メール本文のリンク用。未設定時は本番URL固定値。
//                 ブラウザに公開する必要がない値なのでNEXT_PUBLIC_プレフィックスは付けない。
//                 ※Vercelのダッシュボードでは NEXT_PUBLIC_ 付きだと
//                   「ブラウザに公開されます」という警告でSaveがブロックされるため、
//                   この名前（SITE_URL）で登録すること）
//
// どちらも未設定でも他方は動くようにしてあり、両方未設定でも
// チャット送信など呼び出し元の処理自体は失敗しない。

import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"
import { Resend } from "resend"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  if (!serviceRoleKey) {
    // サーバー側の設定が無い場合は、呼び出し元の処理を止めないよう静かにスキップ
    return res.status(200).json({ ok: true, skipped: "not_configured" })
  }

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
  const senderId = callerData.user.id
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { type, roomId, preview, catId, reason, reportId } = req.body || {}

  let recipientId = null
  let title = "NekoMap"
  let body = ""
  let url = "/"

  if (type === "chat") {
    if (!roomId) return res.status(400).json({ error: "roomIdが必要です" })
    // 送信者が本当にその部屋の当事者かを確認してから相手を特定する
    const { data: room } = await adminClient
      .from("chat_rooms").select("user_a, user_b").eq("id", roomId).maybeSingle()
    if (!room || (room.user_a !== senderId && room.user_b !== senderId)) {
      return res.status(403).json({ error: "この部屋への通知は送信できません" })
    }
    recipientId = room.user_a === senderId ? room.user_b : room.user_a

    const { data: senderProfile } = await adminClient
      .from("users").select("nickname").eq("id", senderId).single()
    title = `💬 ${senderProfile?.nickname || "メッセージ"}さんから新着メッセージ`
    body = (preview || "").slice(0, 80)
    url = `/chat/${roomId}`
  } else if (type === "memorial_report") {
    if (!catId) return res.status(400).json({ error: "catIdが必要です" })
    const { data: cat } = await adminClient
      .from("cats").select("id, name, created_by").eq("id", catId).single()
    if (!cat || !cat.created_by || cat.created_by === senderId) {
      return res.status(200).json({ ok: true, sent: 0 })
    }
    recipientId = cat.created_by
    title = `🕊️ ${cat.name}について訃報の報告がありました`
    body = (reason || "").slice(0, 80)
    url = `/cats/${catId}`
  } else if (type === "trouble_response") {
    if (!reportId) return res.status(400).json({ error: "reportIdが必要です" })
    const { data: report } = await adminClient
      .from("trouble_reports").select("id, created_by, volunteer_name").eq("id", reportId).single()
    if (!report || !report.created_by || report.created_by === senderId) {
      return res.status(200).json({ ok: true, sent: 0 })
    }
    recipientId = report.created_by
    title = "🙋 困りごと投稿に対応者がつきました"
    body = report.volunteer_name ? `${report.volunteer_name}さんが対応します` : ""
    url = "/reports"
  } else {
    return res.status(400).json({ error: "不明な通知種別です" })
  }

  const { data: recipient } = await adminClient
    .from("users")
    .select("email, notification_preferences, email_notifications_enabled")
    .eq("id", recipientId)
    .single()

  // notification_preferencesが未設定(null)の項目はデフォルトON扱い
  const prefs = recipient?.notification_preferences || {}
  if (prefs[type] === false) {
    return res.status(200).json({ ok: true, sent: 0, skipped: "preference_off" })
  }

  let pushSent = 0
  let emailSent = false

  // --- プッシュ通知 ---
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@example.com",
      vapidPublicKey,
      vapidPrivateKey
    )
    const { data: subscriptions } = await adminClient
      .from("push_subscriptions").select("*").eq("user_id", recipientId)

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
            // 期限切れ・無効になった購読はDBから削除しておく
            if (e.statusCode === 404 || e.statusCode === 410) {
              await adminClient.from("push_subscriptions").delete().eq("id", sub.id)
            } else {
              console.error("push送信エラー:", e.message)
            }
          }
        })
      )
    }
  }

  // --- メール通知（本人がONにしている場合のみ） ---
  const resendApiKey = process.env.RESEND_API_KEY
  if (resendApiKey && recipient?.email_notifications_enabled && recipient?.email) {
    try {
      const resend = new Resend(resendApiKey)
      const siteUrl = process.env.SITE_URL || "https://neko-map-app.vercel.app"
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "NekoMap <onboarding@resend.dev>",
        to: recipient.email,
        subject: title,
        text: `${body}\n\n詳しくはこちら: ${siteUrl}${url}`,
      })
      emailSent = true
    } catch (e) {
      console.error("メール送信エラー:", e.message)
    }
  }

  return res.status(200).json({ ok: true, sent: pushSent, email: emailSent })
}
