import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

const CATEGORIES = [
  { value: "all", label: "すべて" },
  { value: "lost", label: "🔍 猫探し" },
  { value: "sighting", label: "👀 目撃情報" },
  { value: "rescue", label: "🏠 保護情報" },
  { value: "volunteer", label: "🙋 ボランティア" },
  { value: "tnr", label: "✂️ TNR" },
  { value: "general", label: "💬 一般" },
]

export default function BoardDetail() {
  const router = useRouter()
  const { id } = router.query
  const [post, setPost] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData.user)

      const { data, error } = await supabase
        .from("posts")
        .select("*, users(nickname, avatar)")
        .eq("id", id)
        .single()
      if (error) console.log("投稿取得エラー:", error.message)
      setPost(data)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleReport() {
    if (!user) { router.push("/login"); return }
    const reason = prompt("通報理由を入力してください")
    if (reason === null) return

    await supabase.from("reports").insert({
      target_id: id,
      target_table: "posts",
      reason,
      created_by: user?.id,
    })

    const newCount = (post.report_count || 0) + 1
    await supabase.from("posts")
      .update({ report_count: newCount, hidden: newCount >= 3 })
      .eq("id", id)

    alert("通報しました。ご協力ありがとうございます。")
    router.push("/board")
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 80 }}>
        <p style={{ color: "#9e7b6e" }}>読み込み中...</p>
      </div>
    )
  }

  if (!post) {
    return (
      <div style={{ textAlign: "center", marginTop: 80 }}>
        <p style={{ color: "#9e7b6e" }}>投稿が見つかりませんでした</p>
        <button onClick={() => router.push("/board")} style={backBtn}>← 掲示板に戻る</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <button onClick={() => router.push("/board")} style={backBtn}>← 掲示板に戻る</button>

      <span style={badgeStyle}>
        {CATEGORIES.find((c) => c.value === post.category)?.label || "💬 一般"}
      </span>
      <h1 style={{ margin: "8px 0 4px", fontSize: 22, color: "#3d3230" }}>{post.title}</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: "#f0e6e0", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13,
        }}>
          {post.users?.avatar
            ? <img src={post.users.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : "🐱"}
        </div>
        <span style={{ fontSize: 13, color: "#9e7b6e" }}>{post.users?.nickname || "匿名"}</span>
        <span style={{ fontSize: 12, color: "#bbb" }}>
          {new Date(post.created_at).toLocaleDateString("ja-JP")}
        </span>
      </div>

      {post.photo && (
        <img src={post.photo} style={{ width: "100%", borderRadius: 12, marginBottom: 20 }} />
      )}

      <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: "#3d3230", marginBottom: 32, fontSize: 15 }}>
        {post.body}
      </p>

      <button onClick={handleReport} style={reportBtn}>🚩 この投稿を通報する</button>
    </div>
  )
}

const backBtn = {
  background: "none", border: "none", cursor: "pointer",
  color: "#e07a5f", fontSize: 16, marginBottom: 16, fontFamily: "inherit",
}
const badgeStyle = {
  display: "inline-block", fontSize: 12, padding: "3px 10px",
  background: "#f0e6e0", color: "#e07a5f", borderRadius: 12,
}
const reportBtn = {
  display: "block", width: "100%", padding: "12px",
  background: "none", color: "#999", border: "1px solid #eee",
  borderRadius: 12, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
}
