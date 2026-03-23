import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import AdBanner from "../../components/AdBanner"

const CATEGORIES = [
  { value: "all", label: "すべて" },
  { value: "lost", label: "🔍 猫探し" },
  { value: "sighting", label: "👀 目撃情報" },
  { value: "rescue", label: "🏠 保護情報" },
  { value: "volunteer", label: "🙋 ボランティア" },
  { value: "tnr", label: "✂️ TNR" },
  { value: "general", label: "💬 一般" },
]

export default function Board() {
  const router = useRouter()
  const [posts, setPosts] = useState([])
  const [category, setCategory] = useState("all")
  const [search, setSearch] = useState("")
  const [user, setUser] = useState(null)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      loadPosts()
    }
    init()
  }, [category])

  async function loadPosts() {
    let query = supabase
      .from("posts")
      .select("*, users(nickname, avatar)")
      .eq("hidden", false)
      .order("created_at", { ascending: false })

    if (category !== "all") {
      query = query.eq("category", category)
    }

    const { data } = await query
    setPosts(data || [])
  }

  async function handleReport(postId) {
    if (!user) { router.push("/login"); return }
    const reason = prompt("通報理由を入力してください")
    if (reason === null) return

    await supabase.from("reports").insert({
      target_id: postId,
      target_table: "posts",
      reason,
      created_by: user?.id,
    })

    const post = posts.find((p) => p.id === postId)
    const newCount = (post.report_count || 0) + 1

    await supabase.from("posts")
      .update({ report_count: newCount, hidden: newCount >= 3 })
      .eq("id", postId)

    alert("通報しました。ご協力ありがとうございます。")
    loadPosts()
  }

  const filtered = posts.filter((p) =>
    search === "" ||
    p.title?.includes(search) ||
    p.body?.includes(search)
  )

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>📋 掲示板</h1>
        <button onClick={() => router.push("/board/new")} style={buttonStyle}>
          ＋ 投稿する
        </button>
      </div>

      <AdBanner />

      <input
        placeholder="🔎 キーワードで検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...inputStyle, marginBottom: 12 }}
      />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
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

      {filtered.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>投稿がありません</p>
      )}

      {filtered.map((post) => (
        <div key={post.id} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{post.title}</h3>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 10,
              background: "#f0e6e0", color: "#e07a5f",
              whiteSpace: "nowrap", marginLeft: 8
            }}>
              {CATEGORIES.find((c) => c.value === post.category)?.label || "💬 一般"}
            </span>
          </div>
          <p style={{ margin: "0 0 8px", color: "#666", fontSize: 14 }}>
            {post.body?.slice(0, 100)}{post.body?.length > 100 ? "..." : ""}
          </p>
          {post.photo && (
            <img src={post.photo} style={{ width: "100%", borderRadius: 8, marginBottom: 8 }} />
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "#f0e6e0", overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12,
              }}>
                {post.users?.avatar
                  ? <img src={post.users.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : "🐱"}
              </div>
              <span style={{ fontSize: 12, color: "#9e7b6e" }}>
                {post.users?.nickname || "匿名"}
              </span>
              <span style={{ fontSize: 12, color: "#bbb" }}>
                {new Date(post.created_at).toLocaleDateString("ja-JP")}
              </span>
            </div>
            <button
              onClick={() => handleReport(post.id)}
              style={{
                padding: "4px 10px", background: "none",
                border: "1px solid #eee", borderRadius: 20,
                fontSize: 12, color: "#999", cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              🚩 通報
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const inputStyle = {
  display: "block", width: "100%", padding: "10px 12px",
  border: "1px solid #f2c4a0", borderRadius: 12,
  fontSize: 16, boxSizing: "border-box",
  background: "white", fontFamily: "inherit",
}
const buttonStyle = {
  padding: "10px 20px", background: "#e07a5f", color: "white",
  border: "none", borderRadius: 20, fontSize: 14, cursor: "pointer",
  fontFamily: "inherit",
}
const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16, padding: 16, marginBottom: 16,
  background: "white",
}