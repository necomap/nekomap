// これまでnext.config.js自体が存在せず、Next.jsの初期設定のままだった。
// 第三者からの攻撃対策の一環として、副作用の少ない基本的なセキュリティ
// ヘッダーを全ページに付与する（クリックジャッキング対策・MIMEスニッフィング
// 対策・リファラー漏洩対策）。厳格なContent-Security-Policyは、Leaflet・
// Google AdSense・インライン記述など既存機能を壊すリスクが高いため今回は
// 追加しない（必要になった場合は別途、影響範囲を確認しながら追加する）。
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // このサイトを他サイトの<iframe>に埋め込ませない（クリックジャッキング対策）
          { key: "X-Frame-Options", value: "DENY" },
          // ブラウザによるContent-Typeの独自判定（MIMEスニッフィング）を無効化
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 他サイトへのリンククリック時に送るリファラー情報を最小限にする
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // ブラウザの強力な機能（カメラ・マイク等）をこのサイトでは使わないため無効化
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ]
  },
}

module.exports = nextConfig
