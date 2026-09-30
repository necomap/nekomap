import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Map, Cat, Pencil } from "lucide-react"
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
      <p style={{ color: "#9e7b6e", fontSize: 14, marginBottom: 12 }}>
        登録済みのナワバリと猫の紐付けを管理できます。
      </p>

      <div style={hintBox}>
        <p style={{ margin: 0, fontSize: 13, color: "#3d3230", lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: 6 }}>
          <Pencil size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>
            このページでは新しいナワバリを描くことはできません。ナワバリの新規登録は、地図ページの描画ツール（多角形アイコン）で地図上に範囲を囲むように登録します。登録時に猫との紐付けも行えます。
          </span>
        </p>
        <button onClick={() => router.push("/map")} style={mapLinkBtn}>
          地図でナワバリを登録する →
        </button>
      </div>

      {territories.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>まだナワバリが登録されていません（上の案内から地図で登録できます）</p>
      )}

      {territories.map((t, i) => (
        <div key={t.id} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 8px", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                <Map size={14} /> ナワバリ #{i + 1}
                {t.cats?.name && (
                  <span style={{
                    marginLeft: 8, fontSize: 12, padding: "2px 8px",
                    background: "#fff0e8", color: "#e07a5f", borderRadius: 10,
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                    <Cat size={11} /> {t.cats.name}
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
const hintBox = {
  padding: 14, marginBottom: 20, borderRadius: 12,
  background: "#fff9f5", border: "1px solid #f2c4a0",
}
const mapLinkBtn = {
  display: "inline-block", marginTop: 10, padding: "6px 14px",
  background: "#e07a5f", color: "white", border: "none",
  borderRadius: 20, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
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
