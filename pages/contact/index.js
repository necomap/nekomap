import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Mail } from "lucide-react"
import PageTitle from "../../components/PageTitle"

const CATEGORIES = [
  "団体・活動者へのレベルアップ申請",
  "投稿内容への異議申し立て",
  "不具合・バグ報告",
  "機能追加の要望",
  "その他",
]

export default function Contact() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit() {
    if (!name) { setError("お名前を入力してください"); return }
    if (!email) { setError("メールアドレスを入力してください"); return }
    if (!category) { setError("カテゴリを選択してください"); return }
    if (!message) { setError("内容を入力してください"); return }

    setLoading(true)
    const { error } = await supabase.from("contacts").insert({
      name, email, category, message,
    })

    if (error) { setError("送信に失敗しました"); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div style={{ maxWidth: 480, margin: "100px auto", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: "#e07a5f", marginBottom: 16 }}>送信完了しました</h2>
        <p style={{ color: "#9e7b6e", fontSize: 14, lineHeight: 1.8 }}>
          お問い合わせありがとうございます。<br />
          管理者が確認後、メールにてご連絡いたします。
        </p>
        <button onClick={() => router.push("/")} style={buttonStyle}>
          トップへ戻る
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Mail size={20} color="#e07a5f" />} title="お問い合わせ" />
      <p style={{ color: "#9e7b6e", fontSize: 14, marginBottom: 24, lineHeight: 1.8 }}>
        団体・活動者へのレベルアップ申請や、不具合報告などはこちらからお送りください。
        管理者が確認後、メールにてご返信いたします。
      </p>

      <input
        placeholder="お名前（必須）"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />
      <input
        type="email"
        placeholder="メールアドレス（必須）"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputStyle}
      />

      <p style={{ fontSize: 13, color: "#9e7b6e", marginBottom: 8 }}>カテゴリ（必須）</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              padding: "10px 16px", borderRadius: 10, fontFamily: "inherit",
              border: category === c ? "2px solid #e07a5f" : "2px solid #f2c4a0",
              background: category === c ? "#fff0e8" : "white",
              cursor: "pointer", fontSize: 14, textAlign: "left",
              color: "#3d3230",
            }}
          >
            {category === c ? "✅ " : ""}{c}
          </button>
        ))}
      </div>

      <textarea
        placeholder="内容を入力してください（必須）"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ ...inputStyle, height: 160 }}
      />

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <button onClick={handleSubmit} disabled={loading} style={buttonStyle}>
        {loading ? "送信中..." : "送信する"}
      </button>
      <button onClick={() => router.back()} style={{ ...buttonStyle, background: "#f0e6e0", color: "#e07a5f", marginTop: 8 }}>
        戻る
      </button>
    </div>
  )
}

const inputStyle = {
  display: "block", width: "100%", padding: "10px 12px",
  marginBottom: 12, border: "1px solid #f2c4a0", borderRadius: 12,
  fontSize: 16, boxSizing: "border-box", fontFamily: "inherit",
}
const buttonStyle = {
  display: "block", width: "100%", padding: "12px",
  background: "#e07a5f", color: "white", border: "none",
  borderRadius: 12, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
}
