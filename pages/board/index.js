import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

export default function Board() {
  const router = useRouter()
  const [posts, setPosts] = useState([])

  useEffect(() => {
    async function loadPosts() {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
      setPosts(data || [])
    }
    loadPosts()
  }, [])

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>📋 掲示板</h1>
        <button onClick={() => router.push("/board/new")} style={buttonStyle}>
          ＋ 投稿する
        </button>
      </div>

      {posts.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>まだ投稿がありません</p>
      )}

      {posts.map((post) => (
        <div key={post.id} style={cardStyle}>
          <h3 style={{ margin: "0 0 8px" }}>{post.title}</h3>
          <p style={{ margin: "0 0 8px", color: "#444" }}>{post.body}</p>
          {post.photo && (
            <img src={post.photo} style={{ width: "100%", borderRadius: 8, marginBottom: 8 }} />
          )}
          <p style={{ margin: 0, fontSize: 12, color: "#999" }}>
            {new Date(post.created_at).toLocaleDateString("ja-JP")}
          </p>
        </div>
      ))}
    </div>
  )
}

const buttonStyle = {
  padding: "10px 20px", background: "#4a90e2", color: "white",
  border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer",
}
const cardStyle = {
  border: "1px solid #eee", borderRadius: 12, padding: 16, marginBottom: 16,
}