import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

export default function NewVolunteer() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit() {
    if (!title) { setError("タイトルを入力してください"); return }
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from("volunteer_requests").insert({
      title, location, description, date,
      created_by: userData.user?.id,
    })

    if (error) { setError("投稿に失敗しました"); setLoading(false); return }
    router.push("/volunteer")
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>🙋 ボランティア募集を投稿</h1>

      <input
        placeholder="タイトル（例：捕獲手伝い募集）（必須）"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder="場所（例：○○公園・静岡県富士市）"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        style={inputStyle}
      />
      <input
        type="datetime-local"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={inputStyle}
      />
      <textarea
        placeholder="内容・詳細を入力してください"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ ...inputStyle, height: 160 }}
      />

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <button onClick={handleSubmit} disabled={loading} style={buttonStyle}>
        {loading ? "投稿中..." : "投稿する"}
      </button>
      <button onClick={() => router.back()} style={{ ...buttonStyle, background: "#999", marginTop: 8 }}>
        戻る
      </button>
    </div>
  )
}

const inputStyle = {
  display: "block", width: "100%", padding: "10px 12px",
  marginBottom: 12, border: "1px solid #ddd", borderRadius: 8,
  fontSize: 16, boxSizing: "border-box",
}
const buttonStyle = {
  display: "block", width: "100%", padding: "12px",
  background: "#4a90e2", color: "white", border: "none",
  borderRadius: 8, fontSize: 16, cursor: "pointer",
}