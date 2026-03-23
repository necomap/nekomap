import { useRouter } from "next/router"
import { useState } from "react"
import { BookOpen } from "lucide-react"
import PageTitle from "../../components/PageTitle"

const SECTIONS = [
  {
    id: "about",
    icon: "🐱",
    title: "NekoMapとは",
    content: "地域猫の情報をみんなでシェアするアプリです。ナワバリ・目撃情報・TNR記録・困りごとなどを地図上で管理できます。",
  },
  {
    id: "register",
    icon: "👤",
    title: "会員登録",
    content: "メールアドレスとパスワードで登録できます。ニックネームのみ公開されます。団体・活動者の方は登録後にお問い合わせからレベルアップ申請をしてください。",
  },
  {
    id: "map",
    icon: "🗺️",
    title: "地図の使い方",
    content: "地図上にはナワバリ・目撃情報・困りごと・トイレ・ハウス・フード場所が表示されます。ピンをタップすると詳細が見られます。左上のボタンでナワバリを描画できます。",
  },
  {
    id: "cats",
    icon: "🐱",
    title: "地域猫の登録",
    content: "猫の名前・写真・特徴・避妊去勢の有無を登録できます。登録した猫に目撃情報・健康記録・TNR予定を紐付けることができます。",
  },
  {
    id: "sighting",
    icon: "👀",
    title: "目撃情報の投稿",
    content: "猫を見かけた場所をGPSまたは地図タップで記録できます。登録済みの猫と紐付けると猫の行動範囲の把握に役立ちます。",
  },
  {
    id: "tnr",
    icon: "✂️",
    title: "TNR記録",
    content: "捕獲日・手術日・病院名・リリース日を記録できます。TNRカレンダーで予定を管理し、猫情報ページからも確認できます。",
  },
  {
    id: "trouble",
    icon: "⚠️",
    title: "困りごとの報告",
    content: "糞尿被害・けんか・怪我など困りごとを地図上に報告できます。ボランティアが「対応します」ボタンで応答し、解決までのステータスを管理できます。",
  },
  {
    id: "board",
    icon: "📋",
    title: "掲示板",
    content: "猫探し・目撃情報・保護情報・ボランティア募集などカテゴリ別に投稿できます。不適切な投稿は通報ボタンで報告できます。",
  },
  {
    id: "volunteer",
    icon: "🙋",
    title: "ボランティア募集",
    content: "捕獲のお手伝いや里親募集など、ボランティアを募集できます。日時・場所・内容を投稿すると応募者が集まります。",
  },
  {
    id: "level",
    icon: "⭐",
    title: "ユーザーレベル",
    content: "一般・活動者・団体の3段階があります。活動者・団体へのレベルアップはお問い合わせから申請してください。団体は認証バッジが表示されます。",
  },
  {
    id: "privacy",
    icon: "🔒",
    title: "個人情報について",
    content: "公開される情報はニックネーム・団体名・ホームページ・寄付情報のみです。位置情報は一般ユーザーには約100mぼかして表示されます。",
  },
  {
    id: "safety",
    icon: "🛡️",
    title: "安全対策",
    content: "悪質な投稿は通報で3件以上で自動非表示になります。管理者が確認後に対応します。悪質なユーザーはBAN・再登録防止の措置を取ります。",
  },
]

export default function Guide() {
  const router = useRouter()
  const [search, setSearch] = useState("")

  const filtered = SECTIONS.filter((s) =>
    search === "" ||
    s.title.includes(search) ||
    s.content.includes(search)
  )

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<BookOpen size={20} color="#e07a5f" />} title="使い方ガイド" />
      <p style={{ color: "#9e7b6e", fontSize: 14, marginBottom: 24 }}>
        NekoMapの使い方を説明します。
      </p>

      <input
        placeholder="🔎 キーワードで検索（例：TNR、登録、地図）"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={inputStyle}
      />

      {filtered.length === 0 && (
        <p style={{ color: "#999", textAlign: "center", marginTop: 24 }}>
          該当する項目がありません
        </p>
      )}

      {filtered.map((section) => (
        <div key={section.id} style={cardStyle}>
          <h3 style={{ margin: "0 0 8px", color: "#3d3230", fontSize: 16 }}>
            {section.icon} {section.title}
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: "#444", lineHeight: 1.8 }}>
            {section.content}
          </p>
        </div>
      ))}

      <div style={{ marginTop: 24, padding: 16, background: "#fff0e8", borderRadius: 16, border: "1px solid #f2c4a0" }}>
        <h3 style={{ margin: "0 0 8px", color: "#e07a5f" }}>📩 わからないことは</h3>
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "#444" }}>
          使い方でわからないことや、団体・活動者へのレベルアップ申請はお問い合わせからどうぞ。
        </p>
        <button onClick={() => router.push("/contact")} style={buttonStyle}>
          お問い合わせへ
        </button>
      </div>
    </div>
  )
}

const inputStyle = {
  display: "block", width: "100%", padding: "10px 12px",
  marginBottom: 20, border: "1px solid #f2c4a0", borderRadius: 12,
  fontSize: 16, boxSizing: "border-box", fontFamily: "inherit",
  background: "white",
}
const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16,
  padding: 16, marginBottom: 12, background: "white",
}
const buttonStyle = {
  padding: "10px 20px", background: "#e07a5f", color: "white",
  border: "none", borderRadius: 20, fontSize: 14,
  cursor: "pointer", fontFamily: "inherit",
}
