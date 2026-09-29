import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import AdBanner from "../../components/AdBanner"
import RegionSelector from "../../components/RegionSelector"
import { useRegionFilter, filterByRegion } from "../../lib/useRegionFilter"
import FavoriteButton from "../../components/FavoriteButton"
import { loadFavoriteIds } from "../../lib/favorites"

const CATEGORIES = [
  { value: "all", label: "すべて" },
  { value: "lost", label: "🔍 猫探し" },
  { value: "sighting", label: "👀 目撃情報" },
  { value: "rescue", label: "🏠 保護情報" },
  { value: "tnr", label: "✂️ TNR" },
  { value: "general", label: "💬 一般" },
]

export default function Board() {
  const router = useRouter()
  const [posts, setPosts] = useState([])
  const [category, setCategory] = useState("all")
  const [search, setSearch] = useState("")
  const [user, setUser] = useState(null)
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const { region, changeRegion } = useRegionFilter()

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      if (data.user) {
        setFavoriteIds(await loadFavoriteIds(data.user.id, "posts"))
      }
      loadPosts()
    }
    init()
  }, [category])

  function handleFavoriteChange(id, next) {
    setFavoriteIds((prev) => {
      const updated = new Set(prev)
      if (next) updated.add(id); else updated.delete(id)
      return updated
    })
  }

  async function loadPosts() {
    // usersテーブル本体は本人・管理者のみ閲覧可のため、FK自動埋め込み(users(...))は使えない。
    // 投稿だけ取得し、投稿者の公開プロフィールをpublic_profilesビューから別途取得して合成する。
    let query = supabase
      .from("posts")
      .select("*")
      .eq("hidden", false)
      .order("created_at", { ascending: false })

    if (category !== "all") {
      query = query.eq("category", category)
    }

    const { data } = await query
    const posts = data || []
    const authorIds = [...new Set(posts.map((p) => p.created_by).filter(Boolean))]
    let profileMap = {}
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("id, nickname, avatar, organization")
        .in("id", authorIds)
      profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
    }
    setPosts(posts.map((p) => ({ ...p, users: profileMap[p.created_by] || null })))
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

  const filtered = filterByRegion(posts, region).filter((p) =>
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

      <RegionSelector region={region ?? ""} onChange={changeRegion} />

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

      <p style={{ fontSize: 12, color: "#bbb", marginBottom: 16, textAlign: "right" }}>
        🙋 ボランティア募集の投稿・閲覧は
        <span onClick={() => router.push("/volunteer")} style={{ color: "#e07a5f", cursor: "pointer", textDecoration: "underline" }}>
          専用ページ
        </span>
        からどうぞ
      </p>

      {filtered.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>投稿がありません</p>
      )}

      {filtered.map((post) => (
        <div
          key={post.id}
          onClick={() => router.push(`/board/${post.id}`)}
          style={{ ...cardStyle, cursor: "pointer" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{post.title}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, flexShrink: 0 }}>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 10,
                background: "#f0e6e0", color: "#e07a5f",
                whiteSpace: "nowrap",
              }}>
                {CATEGORIES.find((c) => c.value === post.category)?.label || "💬 一般"}
              </span>
              {user && (
                <FavoriteButton
                  userId={user.id}
                  targetTable="posts"
                  targetId={post.id}
                  favorited={favoriteIds.has(post.id)}
                  onChange={(next) => handleFavoriteChange(post.id, next)}
                  size={16}
                />
              )}
            </div>
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
                {post.users?.organization && (
                  <span style={{ color: "#4a90e2" }}> ・ 🏢{post.users.organization}</span>
                )}
              </span>
              <span style={{ fontSize: 12, color: "#bbb" }}>
                {new Date(post.created_at).toLocaleDateString("ja-JP")}
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleReport(post.id) }}
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