import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

const TABS = [
  { key: "posts", label: "掲示板" },
  { key: "cats", label: "猫情報" },
  { key: "sightings", label: "目撃情報" },
  { key: "reports", label: "通報一覧" },
  { key: "contacts", label: "お問い合わせ" },
  { key: "users", label: "ユーザー" },
  { key: "blacklist", label: "BAN一覧" },
]

export default function Admin() {
  const router = useRouter()
  const [data, setData] = useState([])
  const [tab, setTab] = useState("posts")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push("/login"); return }
      const { data: profile } = await supabase
        .from("users").select("role").eq("id", userData.user.id).single()
      if (profile?.role !== "admin") { router.push("/"); return }
    }
    checkAdmin()
  }, [])

  useEffect(() => { loadData() }, [tab])

  async function loadData() {
    setLoading(true)
    let result

    if (tab === "posts") {
      result = await supabase.from("posts").select("*").order("created_at", { ascending: false })
    } else if (tab === "cats") {
      result = await supabase.from("cats").select("*").order("created_at", { ascending: false })
    } else if (tab === "sightings") {
      result = await supabase.from("sightings").select("*").order("created_at", { ascending: false })
    } else if (tab === "reports") {
      result = await supabase.from("reports").select("*").order("created_at", { ascending: false })
    } else if (tab === "contacts") {
      result = await supabase.from("contacts").select("*").order("created_at", { ascending: false })
    } else if (tab === "users") {
      result = await supabase.from("users").select("*").order("created_at", { ascending: false })
    } else if (tab === "blacklist") {
      result = await supabase.from("blacklist").select("*").order("created_at", { ascending: false })
    }

    setData(result?.data || [])
    setLoading(false)
  }

  async function deleteItem(table, id) {
    if (!confirm("削除しますか？")) return
    await supabase.from(table).delete().eq("id", id)
    loadData()
  }

  async function unhidePost(id) {
    await supabase.from("posts").update({ hidden: false, report_count: 0 }).eq("id", id)
    loadData()
  }

  async function banUser(user) {
    if (!confirm(`${user.nickname || user.name}をBANしますか？`)) return
    const reason = prompt("BAN理由を入力してください")
    if (!reason) return
    const { data: adminData } = await supabase.auth.getUser()
    await supabase.from("users").update({ role: "banned" }).eq("id", user.id)
    await supabase.from("blacklist").insert({
      user_id: user.id,
      email: user.email,
      reason,
      created_by: adminData.user.id,
    })
    loadData()
  }

  async function unbanUser(id) {
    await supabase.from("users").update({ role: "user" }).eq("id", id)
    await supabase.from("blacklist").delete().eq("user_id", id)
    loadData()
  }

  async function setAccountType(id, type) {
    await supabase.from("users").update({
      account_type: type,
      verified: type === "organization",
      role: type === "admin" ? "admin" : "user",
    }).eq("id", id)
    loadData()
  }

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24, color: "#3d3230" }}>⚙️ 管理画面</h1>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 16px", borderRadius: 20, border: "none",
            cursor: "pointer", fontFamily: "inherit", fontSize: 13,
            background: tab === t.key ? "#e07a5f" : "#f0e6e0",
            color: tab === t.key ? "white" : "#3d3230",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ textAlign: "center", color: "#999" }}>読み込み中...</p>}

      {data.map((item) => (
        <div key={item.id} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, marginRight: 12 }}>

              {tab === "posts" && (
                <>
                  <p style={{ margin: "0 0 4px", fontWeight: 500 }}>{item.title}</p>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "#666" }}>{item.body?.slice(0, 80)}</p>
                  {item.hidden && <span style={badgeRed}>非表示中（通報{item.report_count}件）</span>}
                </>
              )}

              {tab === "cats" && (
                <p style={{ margin: "0 0 4px", fontWeight: 500 }}>🐱 {item.name}</p>
              )}

              {tab === "sightings" && (
                <>
                  <p style={{ margin: "0 0 4px", fontWeight: 500 }}>📍 目撃情報</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{item.description?.slice(0, 80)}</p>
                </>
              )}

              {tab === "reports" && (
                <>
                  <p style={{ margin: "0 0 4px", fontWeight: 500 }}>🚩 通報</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#666" }}>理由: {item.reason}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#bbb" }}>対象ID: {item.target_id}</p>
                </>
              )}

              {tab === "contacts" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 10,
                      background: item.status === "対応済" ? "#e8f5e9" : "#fff3e0",
                      color: item.status === "対応済" ? "#2e7d32" : "#e65100",
                    }}>
                      {item.status}
                    </span>
                    <span style={{ fontWeight: 500 }}>{item.category}</span>
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "#666" }}>
                    {item.name}（{item.email}）
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#444" }}>{item.message?.slice(0, 100)}</p>
                </>
              )}

              {tab === "users" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    {item.avatar && (
                      <img src={item.avatar} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                    )}
                    <p style={{ margin: 0, fontWeight: 500 }}>
                      {item.nickname || item.name}
                      {item.role === "banned" && <span style={badgeRed}> BAN済み</span>}
                      {item.verified && <span style={badgeGreen}> ✅ 認証済み</span>}
                    </p>
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "#666" }}>{item.email}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#999" }}>
                    種別: {
                      item.account_type === "organization" ? "🏢 団体" :
                      item.account_type === "activist" ? "🙋 活動者" :
                      item.role === "admin" ? "⚙️ 管理者" : "👤 一般"
                    }
                  </p>
                </>
              )}

              {tab === "blacklist" && (
                <>
                  <p style={{ margin: "0 0 4px", fontWeight: 500 }}>🚫 {item.email}</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#666" }}>理由: {item.reason}</p>
                </>
              )}

              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#bbb" }}>
                {new Date(item.created_at).toLocaleDateString("ja-JP")}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tab === "posts" && item.hidden && (
                <button onClick={() => unhidePost(item.id)} style={btnGreen}>再表示</button>
              )}
              {tab === "contacts" && item.status !== "対応済" && (
                <button onClick={async () => {
                  await supabase.from("contacts").update({ status: "対応済" }).eq("id", item.id)
                  loadData()
                }} style={btnGreen}>対応済</button>
              )}
              {tab === "users" && item.role !== "banned" && (
                <>
                  <button onClick={() => banUser(item)} style={btnRed}>BAN</button>
                  <select
                    value={item.account_type || "general"}
                    onChange={(e) => setAccountType(item.id, e.target.value)}
                    style={selectStyle}
                  >
                    <option value="general">👤 一般</option>
                    <option value="activist">🙋 活動者</option>
                    <option value="organization">🏢 団体</option>
                    <option value="admin">⚙️ 管理者</option>
                  </select>
                </>
              )}
              {tab === "users" && item.role === "banned" && (
                <button onClick={() => unbanUser(item.id)} style={btnGreen}>BAN解除</button>
              )}
              {tab === "blacklist" && (
                <button onClick={() => unbanUser(item.user_id)} style={btnGreen}>解除</button>
              )}
              {["posts", "cats", "sightings", "reports", "contacts"].includes(tab) && (
                <button onClick={() => deleteItem(tab === "reports" ? "reports" : tab, item.id)} style={btnRed}>削除</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16,
  padding: 16, marginBottom: 12, background: "white",
}
const btnRed = {
  padding: "6px 12px", background: "#ff4444", color: "white",
  border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer",
  fontFamily: "inherit",
}
const btnGreen = {
  padding: "6px 12px", background: "#43a047", color: "white",
  border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer",
  fontFamily: "inherit",
}
const selectStyle = {
  padding: "4px 8px", border: "1px solid #f2c4a0",
  borderRadius: 8, fontSize: 12, fontFamily: "inherit",
  background: "white",
}
const badgeRed = {
  display: "inline-block", fontSize: 11, padding: "2px 8px",
  background: "#ffebee", color: "#c62828", borderRadius: 10,
}
const badgeGreen = {
  display: "inline-block", fontSize: 11, padding: "2px 8px",
  background: "#e8f5e9", color: "#2e7d32", borderRadius: 10,
}