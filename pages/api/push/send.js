// チャットの新着メッセージをプッシュ通知するAPI（サーバー側専用）
//
// 呼び出し元: pages/chat/[room].js が、メッセージ送信に成功した直後に
//   このAPIを呼ぶ（クライアント発火方式）。送信者自身の認証情報で
//   「本当にその部屋の当事者か」を確認してから、相手側の購読情報に
//   向けてプッシュ通知を送る。
//
// 事前準備（一度だけ）:
//   1. .env.local に以下を追加
//        NEXT_PUBLIC_VAPID_PUBLIC_KEY=（公開鍵）
//        VAPID_PRIVATE_KEY=（秘密鍵。NEXT_PUBLIC_を付けないこと）
//        VAPID_SUBJECT=mailto:（連絡用メールアドレス）
//   2. Vercelの環境変数にも同じ3つを追加（Production/Preview/Development）
//   3. package.json に web-push を追加し、npm install
//   4. 開発サーバー再起動 / Vercel再デプロイ
//
// これらが未設定でもチャット自体は問題なく使えるよう、
// 通知だけ静かにスキップする作りにしてある。

import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

  // 通知機能が未設定でも、チャット送信自体は失敗させたくないので静かに終了する
  if (!serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return res.status(200).json({ ok: true, skipped: "not_configured" })
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    vapidPublicKey,
    vapidPrivateKey
  )

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

  const { roomId, preview } = req.body || {}
  if (!roomId) {
    return res.status(400).json({ error: "roomIdが必要です" })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // 送信者が本当にその部屋の当事者かを確認してから相手を特定する
  // （他人の部屋IDを指定して勝手に通知を飛ばせないようにするため）
  const { data: room } = await adminClient
    .from("chat_rooms").select("user_a, user_b").eq("id", roomId).maybeSingle()
  if (!room || (room.user_a !== senderId && room.user_b !== senderId)) {
    return res.status(403).json({ error: "この部屋への通知は送信できません" })
  }
  const recipientId = room.user_a === senderId ? room.user_b : room.user_a

  const { data: senderProfile } = await adminClient
    .from("users").select("nickname").eq("id", senderId).single()

  const { data: subscriptions } = await adminClient
    .from("push_subscriptions").select("*").eq("user_id", recipientId)

  if (!subscriptions || subscriptions.length === 0) {
    return res.status(200).json({ ok: true, sent: 0 })
  }

  const payload = JSON.stringify({
    title: `💬 ${senderProfile?.nickname || "メッセージ"}さんから新着メッセージ`,
    body: (preview || "").slice(0, 80),
    url: `/chat/${roomId}`,
  })

  let sent = 0
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (e) {
        // 期限切れ・無効になった購読はDBから削除しておく（そのままだと毎回エラーになるだけのため）
        if (e.statusCode === 404 || e.statusCode === 410) {
          await adminClient.from("push_subscriptions").delete().eq("id", sub.id)
        } else {
          console.error("push送信エラー:", e.message)
        }
      }
    })
  )

  return res.status(200).json({ ok: true, sent })
}
