import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

export default function NewPost() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit() {
    if (!title) { setError("タイトルを入力してください"); return }
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
      title, body, photo: photoUrl,
      created_by: userData.user?.id,
    })

    if (error) { setError("投稿に失敗しました"); setLoading(false); return }
    router.push("/board")
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>📝 掲示板に投稿</h1>
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
        <span style={{ display: "block", marginBottom: 4, color: "#666" }}>写真（任意）</span>
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
      </label>
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