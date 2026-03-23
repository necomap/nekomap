import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Map } from "lucide-react"
import PageTitle from "../../components/PageTitle"

export default function Territories() {
  const router = useRouter()
  const [territories, setTerritories] = useState([])
  const [cats, setCats] = useState([])
  const [user, setUser] = useState(null)

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push("/login"); return }
      setUser(userData.user)
      loadData()
    }
    init()
  }, [])

  async function loadData() {
    const { data: t } = await supabase
      .from("territories").select("*, cats(name)")
      .order("created_at", { ascending: false })
    setTerritories(t || [])
    const { data: c } = await supabase.from("cats").select("id, name")
    setCats(c || [])
  }

  async function linkCat(territoryId, catId) {
    await supabase.from("territories").update({
      cat_id: catId || null,
      color: catId ? "#e07a5f" : "#4a90e2",
    }).eq("id", territoryId)
    loadData()
  }

  async function deleteTerritory(id) {
    if (!confirm("このナワバリを削除しますか？")) return
    await supabase.from("territories").delete().eq("id", id)
    loadData()
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Map size={20} color="#e07a5f" />} title="ナワバリ管理" />
      <p style={{ color: "#9e7b6e", fontSize: 14, marginBottom: 24 }}>
        登録済みのナワバリと猫の紐付けを管理できます。
      </p>

      {territories.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>ナワバリが登録されていません</p>
      )}

      {territories.map((t, i) => (
        <div key={t.id} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 8px", fontWeight: 500 }}>
                🗺️ ナワバリ #{i + 1}
                {t.cats?.name && (
                  <span style={{
                    marginLeft: 8, fontSize: 12, padding: "2px 8px",
                    background: "#fff0e8", color: "#e07a5f", borderRadius: 10,
                  }}>
                    🐱 {t.cats.name}
                  </span>
                )}
              </p>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#bbb" }}>
                {new Date(t.created_at).toLocaleDateString("ja-JP")}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select
                  value={t.cat_id || ""}
                  onChange={(e) => linkCat(t.id, e.target.value)}
                  style={selectStyle}
                >
                  <option value="">猫と紐付けない</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={() => deleteTerritory(t.id)} style={deleteBtn}>削除</button>
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
const selectStyle = {
  padding: "6px 12px", border: "1px solid #f2c4a0",
  borderRadius: 8, fontSize: 14, fontFamily: "inherit",
  background: "white", color: "#3d3230",
}
const deleteBtn = {
  padding: "6px 12px", background: "#ffebee", color: "#c62828",
  border: "none", borderRadius: 8, fontSize: 12,
  cursor: "pointer", fontFamily: "inherit",
}
