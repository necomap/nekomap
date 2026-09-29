import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Star } from "lucide-react"
import PageTitle from "../../components/PageTitle"
import FavoriteButton from "../../components/FavoriteButton"
import { FAVORITABLE_TABLES } from "../../lib/favorites"

const TYPE_LABELS = {
  feces: "💩 糞尿被害", fight: "🐾 けんか多発", injury: "🩹 怪我・病気", other: "❓ その他",
}

// お気に入り一覧ページ。favoritesテーブルに登録された投稿を、
// 元のテーブルごとにグルーピングして表示する。
export default function Favorites() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState({ trouble_reports: [], adoptions: [], volunteer_requests: [], posts: [] })

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { router.push("/login"); return }
      setUser(data.user)
      await load(data.user.id)
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(userId) {
    const { data: favs } = await supabase
      .from("favorites")
      .select("target_table, target_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    const grouped = { trouble_reports: [], adoptions: [], volunteer_requests: [], posts: [] }
    for (const table of Object.keys(FAVORITABLE_TABLES)) {
      const ids = (favs || []).filter((f) => f.target_table === table).map((f) => f.target_id)
      if (ids.length === 0) continue
      const { data: rows } = await supabase.from(table).select("*").in("id", ids)
      // お気に入り登録順を保つ
      const order = Object.fromEntries(ids.map((id, i) => [id, i]))
      grouped[table] = (rows || []).sort((a, b) => order[a.id] - order[b.id])
    }
    setItems(grouped)
  }

  function handleUnfavorite(table, id, next) {
    if (next) return
    setItems((prev) => ({ ...prev, [table]: prev[table].filter((i) => i.id !== id) }))
  }

  const total = Object.values(items).reduce((sum, arr) => sum + arr.length, 0)

  if (loading) {
    return <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>読み込み中...</div>
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Star size={20} color="#f5a623" />} title="お気に入り" />

      {total === 0 && (
        <p style={{ color: "#999", textAlign: "center", marginTop: 24 }}>
          お気に入りはまだありません。各一覧のカードにある⭐ボタンから追加できます。
        </p>
      )}

      {items.trouble_reports.length > 0 && (
        <>
          <h3 style={sectionTitle}>⚠️ 困りごと</h3>
          {items.trouble_reports.map((r) => (
            <div key={r.id} style={cardStyle} onClick={() => router.push("/reports")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{TYPE_LABELS[r.type] || r.type}</span>
                <FavoriteButton userId={user.id} targetTable="trouble_reports" targetId={r.id} favorited={true}
                  onChange={(next) => handleUnfavorite("trouble_reports", r.id, next)} size={16} />
              </div>
              {r.description && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#666" }}>{r.description}</p>}
            </div>
          ))}
        </>
      )}

      {items.adoptions.length > 0 && (
        <>
          <h3 style={sectionTitle}>🏠 里親募集</h3>
          {items.adoptions.map((a) => (
            <div key={a.id} style={cardStyle} onClick={() => router.push(`/adoption/${a.id}`)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{a.name}{a.status === "成立" ? "（成立済み）" : ""}</span>
                <FavoriteButton userId={user.id} targetTable="adoptions" targetId={a.id} favorited={true}
                  onChange={(next) => handleUnfavorite("adoptions", a.id, next)} size={16} />
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#666" }}>
                {a.fee_amount > 0 ? `負担金額: ${a.fee_amount.toLocaleString()}円` : "負担金額: 無料"}
              </p>
            </div>
          ))}
        </>
      )}

      {items.volunteer_requests.length > 0 && (
        <>
          <h3 style={sectionTitle}>🙋 ボランティア募集</h3>
          {items.volunteer_requests.map((v) => (
            <div key={v.id} style={cardStyle} onClick={() => router.push("/volunteer")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{v.title}</span>
                <FavoriteButton userId={user.id} targetTable="volunteer_requests" targetId={v.id} favorited={true}
                  onChange={(next) => handleUnfavorite("volunteer_requests", v.id, next)} size={16} />
              </div>
              {v.location && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#666" }}>📍 {v.location}</p>}
            </div>
          ))}
        </>
      )}

      {items.posts.length > 0 && (
        <>
          <h3 style={sectionTitle}>📋 掲示板</h3>
          {items.posts.map((p) => (
            <div key={p.id} style={cardStyle} onClick={() => router.push(`/board/${p.id}`)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{p.title}</span>
                <FavoriteButton userId={user.id} targetTable="posts" targetId={p.id} favorited={true}
                  onChange={(next) => handleUnfavorite("posts", p.id, next)} size={16} />
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#666" }}>
                {p.body?.slice(0, 80)}{p.body?.length > 80 ? "..." : ""}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

const sectionTitle = { margin: "20px 0 8px", color: "#e07a5f", fontSize: 15 }
const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16,
  padding: 16, marginBottom: 12, background: "white", cursor: "pointer",
}
