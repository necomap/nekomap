import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

export default function Admin() {
  const router = useRouter()
  const [posts, setPosts] = useState([])
  const [cats, setCats] = useState([])
  const [sightings, setSightings] = useState([])
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState("posts")

  useEffect(() => {
    async function checkAdmin() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { router.push("/login"); return }

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single()

      if (userData?.role !== "admin") {
        router.push("/")
        return
      }
    }
    checkAdmin()
    loadAll()
  }, [])

  async function loadAll() {
    const [p, c, s, u] = await Promise.all([
      supabase.from("posts").select("*").order("created_at", { ascending: false }),
      supabase.from("cats").select("*").order("created_at", { ascending: false }),
      supabase.from("sightings").select("*").order("created_at", { ascending: false }),
      supabase.from("users").select("*").order("created_at", { ascending: false }),
    ])
    setPosts(p.data || [])
    setCats(c.data || [])
    setSightings(s.data || [])
    setUsers(u.data || [])
  }

  async function deleteItem(table, id) {
    if (!confirm("削除しますか？")) return
    await supabase.from(table).delete().eq("id", id)
    loadAll()
  }

  async function banUser(id) {
    if (!confirm("このユーザーをブロックしますか？")) return
    await supabase.from("users").update({ role: "banned" }).eq("id", id)
    loadAll()
  }

  const tabs = [
    { key: "posts", label: "掲示板", data: posts, table: "posts" },
    { key: "cats", label: "猫情報", data: cats, table: "cats" },
    { key: "sightings", label: "目撃情報", data: sightings, table: "sightings" },
    { key: "users", label: "ユーザー", data: users, table: "users" },
  ]

  const current = tabs.find((t) => t.key === tab)

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>⚙️ 管理画面</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: tab === t.key ? "#4a90e2" : "#f0f0f0",
              color: tab === t.key ? "white" : "#333",
              fontSize: 14,
            }}
          >
            {t.label}（{t.data.length}）
          </button>
        ))}
      </div>

      {current?.data.map((item) => (
        <div key={item.id} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              {tab === "posts" && (
                <>
                  <p style={{ margin: "0 0 4px", fontWeight: 500 }}>{item.title}</p>
                  <p style={{ margin: 0, color: "#666", fontSize: 14 }}>{item.body?.slice(0, 80)}</p>
                </>
              )}
              {tab === "cats" && (
                <>
                  <p style={{ margin: "0 0 4px", fontWeight: 500 }}>🐱 {item.name}</p>
                  <p style={{ margin: 0, color: "#666", fontSize: 14 }}>{item.features?.slice(0, 80)}</p>
                </>
              )}
              {tab === "sightings" && (
                <>
                  <p style={{ margin: "0 0 4px", fontWeight: 500 }}>📍 目撃情報</p>
                  <p style={{ margin: 0, color: "#666", fontSize: 14 }}>{item.description?.slice(0, 80)}</p>
                  <p style={{ margin: 0, color: "#999", fontSize: 12 }}>lat: {item.lat}, lng: {item.lng}</p>
                </>
              )}
              {tab === "users" && (
                <>
                  <p style={{ margin: "0 0 4px", fontWeight: 500 }}>👤 {item.nickname || item.name}</p>
                  <p style={{ margin: 0, color: "#666", fontSize: 14 }}>{item.email}</p>
                  <p style={{ margin: 0, color: item.role === "banned" ? "red" : "#999", fontSize: 12 }}>
                    {item.role}
                  </p>
                </>
              )}
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#bbb" }}>
                {new Date(item.created_at).toLocaleDateString("ja-JP")}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, marginLeft: 16 }}>
              {tab === "users" && item.role !== "banned" && (
                <button onClick={() => banUser(item.id)} style={dangerButton}>
                  BAN
                </button>
              )}
              <button onClick={() => deleteItem(current.table, item.id)} style={dangerButton}>
                削除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const cardStyle = {
  border: "1px solid #eee", borderRadius: 12,
  padding: 16, marginBottom: 12,
}
const dangerButton = {
  padding: "6px 12px", background: "#ff4444", color: "white",
  border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer",
}