import { ShoppingBag } from "lucide-react"

// Amazonアソシエイト（トラッキングID: luckenekomap-22）の控えめなテキスト広告枠。
// 画像やスクリプトは読み込まず、Amazonの検索結果ページへのリンクのみ。
// 掲載する商品カテゴリを変えたいときは ITEMS の配列を書き換えるだけでよい。
const TAG = "luckenekomap-22"

const ITEMS = [
  { label: "捕獲器", keyword: "猫 捕獲器" },
  { label: "キャットフード", keyword: "キャットフード" },
  { label: "猫砂", keyword: "猫砂" },
  { label: "屋外用猫ハウス", keyword: "猫ハウス 屋外" },
  { label: "キャリーケース", keyword: "猫 キャリー" },
]

const amazonUrl = (keyword) =>
  `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${TAG}`

export default function AmazonPicks() {
  return (
    <div
      style={{
        margin: "16px 0 8px", padding: "12px 14px",
        background: "rgba(255,255,255,0.85)", border: "1px solid #f2e0d4",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{
          fontSize: 10, padding: "1px 6px", borderRadius: 6,
          background: "#f0e6e0", color: "#9e7b6e", fontWeight: 600,
        }}>PR</span>
        <span style={{ fontSize: 12, color: "#9e7b6e", display: "flex", alignItems: "center", gap: 4 }}>
          <ShoppingBag size={12} /> 地域猫活動に役立つグッズ（Amazon）
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {ITEMS.map((item) => (
          <a
            key={item.label}
            href={amazonUrl(item.keyword)}
            target="_blank"
            rel="sponsored noopener noreferrer"
            style={{
              fontSize: 12, padding: "4px 10px", borderRadius: 14,
              border: "1px solid #f2c4a0", color: "#3d3230",
              background: "white", textDecoration: "none",
            }}
          >
            {item.label}
          </a>
        ))}
      </div>

      <p style={{ margin: "8px 0 0", fontSize: 10, color: "#bbb", lineHeight: 1.5 }}>
        Amazonのアソシエイトとして、NekoMapは適格販売により収入を得ています。
      </p>
    </div>
  )
}
