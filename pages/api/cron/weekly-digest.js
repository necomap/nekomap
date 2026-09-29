// 週次ダイジェストメール（Vercel Cronから毎週月曜に呼び出される）
//
// 「デフォルト地域」を設定し、メール通知ON かつ
// notification_preferences.weekly_digest を true にしているユーザーへ、
// 過去7日間のその地域の新着（困りごと・里親募集中・ボランティア募集・掲示板）
// をまとめてResendで送信する。新着が0件の地域は送信しない。
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // Vercel Cron からのリクエストのみ許可
  const authHeader = req.headers["authorization"]
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  if (!serviceRoleKey) {
    return res.status(200).json({ ok: true, skipped: "not_configured" })
  }
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return res.status(200).json({ ok: true, skipped: "resend_not_configured" })
  }

  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const resend = new Resend(resendApiKey)
    const siteUrl = process.env.SITE_URL || "https://neko-map-app.vercel.app"
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: candidates } = await adminClient
      .from("users")
      .select("id, email, default_prefecture, notification_preferences, email_notifications_enabled")
      .not("default_prefecture", "is", null)
      .eq("email_notifications_enabled", true)

    const targets = (candidates || []).filter(
      (u) => u.notification_preferences?.weekly_digest === true && u.email
    )

    if (targets.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, reason: "no_opted_in_users" })
    }

    // 地域ごとの新着はユーザー間で共通のため、地域単位でキャッシュする
    const digestCache = {}
    async function getDigest(prefecture) {
      if (digestCache[prefecture]) return digestCache[prefecture]
      const [reports, adoptions, volunteers, posts] = await Promise.all([
        adminClient.from("trouble_reports").select("id, type, description")
          .eq("prefecture", prefecture).gte("created_at", since),
        adminClient.from("adoptions").select("id, name")
          .eq("prefecture", prefecture).eq("status", "募集中").gte("created_at", since),
        adminClient.from("volunteer_requests").select("id, title")
          .eq("prefecture", prefecture).gte("created_at", since),
        adminClient.from("posts").select("id, title")
          .eq("prefecture", prefecture).eq("hidden", false).gte("created_at", since),
      ])
      const digest = {
        reports: reports.data || [],
        adoptions: adoptions.data || [],
        volunteers: volunteers.data || [],
        posts: posts.data || [],
      }
      digestCache[prefecture] = digest
      return digest
    }

    let sent = 0
    for (const user of targets) {
      const digest = await getDigest(user.default_prefecture)
      const total = digest.reports.length + digest.adoptions.length + digest.volunteers.length + digest.posts.length
      if (total === 0) continue

      const lines = []
      if (digest.reports.length > 0) {
        lines.push(`【困りごと報告】${digest.reports.length}件`)
        digest.reports.slice(0, 5).forEach((r) => lines.push(`　・${r.type || ""} ${(r.description || "").slice(0, 40)}`))
      }
      if (digest.adoptions.length > 0) {
        lines.push(`【里親募集】${digest.adoptions.length}件`)
        digest.adoptions.slice(0, 5).forEach((a) => lines.push(`　・${a.name}`))
      }
      if (digest.volunteers.length > 0) {
        lines.push(`【ボランティア募集】${digest.volunteers.length}件`)
        digest.volunteers.slice(0, 5).forEach((v) => lines.push(`　・${v.title}`))
      }
      if (digest.posts.length > 0) {
        lines.push(`【掲示板】${digest.posts.length}件`)
        digest.posts.slice(0, 5).forEach((p) => lines.push(`　・${p.title}`))
      }

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "NekoMap <onboarding@resend.dev>",
          to: user.email,
          subject: `📬 ${user.default_prefecture}の新着まとめ（今週分）- NekoMap`,
          text:
            `${user.default_prefecture}での、この1週間の新着情報です。\n\n` +
            lines.join("\n") +
            `\n\n詳しくはこちら: ${siteUrl}\n\n` +
            `※この通知は、プロフィール編集画面の「週次ダイジェストメール」設定をONにしている方に送信されています。不要な場合は同画面でOFFにできます。`,
        })
        sent++
      } catch (e) {
        console.error("週次ダイジェスト送信エラー:", e.message)
      }
    }

    return res.status(200).json({ ok: true, sent, candidates: targets.length })
  } catch (error) {
    return res.status(500).json({ success: false, error: String(error) })
  }
}
