import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { checkPostLimit } from "../../lib/checkPostLimit"
import { ClipboardList } from "lucide-react"
import PageTitle from "../../components/PageTitle"

const CATEGORIES = [
  { value: "lost", label: "🔍 猫探し" },
  { value: "sighting", label: "👀 目撃情報" },
  { value: "rescue", label: "🏠 保護情報" },
  { value: "volunteer", label: "🙋 ボランティア" },
  { value: "tnr", label: "✂️ TNR" },
  { value: "general", label: "💬 一般" },
]

export default function NewPost() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [category, setCategory] = useState("general")
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit() {
    if (!title) { setError("タイトルを入力してください"); return }

    const limit = await checkPostLimit("posts")
    if (!limit.ok) { setError(limit.message); return }

    setLoading(true)
    let photoUrl = null

    if (photo) {
      const fileName = `${Date.now()}_${photo.name}`
      const { error: uploadError } = await supabase.storage
        .from("cat-photos").upload(fileName, photo)
      if (!uploadError) {
        const { data } = supabase.storage.from("cat-photos").getPublicUrl(fileName)
        photoUrl = data.publicUrl
      }
    }

    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from("posts").insert({
      title, body, category, photo: photoUrl,
      created_by: userData.user?.id,
    })

    if (error) { setError("投稿に失敗しました"); setLoading(false); return }
    router.push("/board")
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<ClipboardList size={20} color="#e07a5f" />} title="掲示板に投稿" />

      <p style={{ marginBottom: 8, color: "#9e7b6e", fontSize: 13 }}>カテゴリを選択</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            style={{
              padding: "6px 12px", borderRadius: 20, fontSize: 13,
              border: "none", cursor: "pointer", fontFamily: "inherit",
              background: category === c.value ? "#e07a5f" : "#f0e6e0",
              color: category === c.value ? "white" : "#3d3230",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <input
        placeholder="タイトル（必須）"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={inputStyle}
      />
      <textarea
        placeholder="内容を入力してください"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        style={{ ...inputStyle, height: 160 }}
      />
      <label style={{ display: "block", marginBottom: 12 }}>
        <span style={{ display: "block", marginBottom: 4, color: "#9e7b6e", fontSize: 13 }}>写真（任意）</span>
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
      </label>

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <button onClick={handleSubmit} disabled={loading} style={buttonStyle}>
        {loading ? "投稿中..." : "投稿する"}
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
