import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { PawPrint, Trash2, Scissors, Plus } from "lucide-react"
import PageTitle from "../../components/PageTitle"
import RegionSelector from "../../components/RegionSelector"
import { useRegionFilter, filterByRegion } from "../../lib/useRegionFilter"

// 野良猫出没情報の一覧ページ。
// stray_reportsは（地図(MapView.js)が直接select("*")している通り）
// 一般公開のSELECTポリシーになっているため、RPCを介さず直接取得してよい。
export default function StrayList() {
  const router = useRouter()
  const [reports, setReports] = useState([])
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const { region, changeRegion } = useRegionFilter()

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData.user)
      if (userData.user) {
        const { data: p } = await supabase
          .from("users").select("role").eq("id", userData.user.id).single()
        setProfile(p)
      }
      await loadReports()
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadReports() {
    const { data, error } = await supabase
      .from("stray_reports")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) { console.log("野良猫情報取得エラー:", error.message); return }
    setReports(data || [])
  }

  async function handleDelete(r) {
    if (!confirm("この野良猫出没情報を削除しますか？")) return
    const { error } = await supabase.from("stray_reports").delete().eq("id", r.id)
    if (error) { alert("削除に失敗しました: " + error.message); return }
    setReports((prev) => prev.filter((x) => x.id !== r.id))
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <PageTitle icon={<PawPrint size={20} color="#e07a5f" />} title="野良猫出没情報一覧" />
        <button onClick={() => router.push("/stray/new")} style={{ ...buttonStyle, display: "flex", alignItems: "center", gap: 4 }}>
          <Plus size={14} /> 追加
        </button>
      </div>

      <RegionSelector region={region ?? ""} onChange={changeRegion} />

      {loading && <p style={{ textAlign: "center", color: "#999" }}>読み込み中...</p>}

      {!loading && filterByRegion(reports, region).length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>まだ野良猫出没情報がありません</p>
      )}

      {filterByRegion(reports, region).map((r) => {
        const canDelete = (user && r.created_by === user.id) || profile?.role === "admin"
        return (
          <div key={r.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                <PawPrint size={15} color="#888" /> 野良猫目撃
              </span>
              {canDelete && (
                <button onClick={() => handleDelete(r)} style={deleteBtn} title="削除する">
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {r.features && (
              <p style={{ margin: "0 0 8px", color: "#444", fontSize: 14 }}>{r.features}</p>
            )}
            {r.comment && (
              <p style={{ margin: "0 0 8px", color: "#666", fontSize: 13 }}>{r.comment}</p>
            )}
            {r.photo && (
              <img src={r.photo} style={{ width: "100%", borderRadius: 8, marginBottom: 8 }} />
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#bbb" }}>
                {new Date(r.created_at).toLocaleDateString("ja-JP")}
              </p>
              {r.tnr_planned && (
                <span style={{ fontSize: 11, color: "#7b61ff", display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <Scissors size={11} /> TNR予定{r.tnr_by ? `（${r.tnr_by}）` : ""}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const buttonStyle = {
  padding: "10px 20px", background: "#e07a5f", color: "white",
  border: "none", borderRadius: 20, fontSize: 14, cursor: "pointer",
  fontFamily: "inherit",
}
const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16,
  padding: 16, marginBottom: 16, background: "white",
}
const deleteBtn = {
  padding: "6px 10px", background: "none", color: "#e05252",
  border: "1px solid #f5c2c2", borderRadius: 8, cursor: "pointer",
  fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center",
}
