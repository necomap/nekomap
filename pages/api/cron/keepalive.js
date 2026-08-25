// Vercel Cron から定期的に呼び出され、Supabase(無料枠)へ軽いクエリを送ることで
// 「7日間アクセスがないと自動一時停止(Pause)」される問題を防ぐためのエンドポイント。
// foodlabel-pro の app/api/cron/keepalive/route.ts と同じ考え方を
// NekoMap の Pages Router 構成に合わせて移植したもの。
import { supabase } from "../../../lib/supabase"

export default async function handler(req, res) {
  // Vercel Cron からのリクエストのみ許可(手動で誰でも叩けないようにする)
  const authHeader = req.headers["authorization"]
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    // catsテーブルへ軽いSELECTを1件投げるだけ。結果の中身は使わない。
    const { error } = await supabase.from("cats").select("id").limit(1)
    if (error) throw error

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return res.status(500).json({ success: false, error: String(error) })
  }
}
