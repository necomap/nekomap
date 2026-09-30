import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { MapPin, Toilet, Home, Utensils, Trash2, CheckCircle2, Plus } from "lucide-react"
import PageTitle from "../../components/PageTitle"
import RegionSelector from "../../components/RegionSelector"
import { useRegionFilter, filterByRegion } from "../../lib/useRegionFilter"

const TYPE_INFO = {
  toilet: { label: "トイレ", icon: Toilet },
  house: { label: "猫ハウス", icon: Home },
  food: { label: "フード場所", icon: Utensils },
}

// スポット（トイレ・猫ハウス・フード場所）の一覧ページ。
// cat_spotsのSELECTポリシー自体が「フード以外は誰でも閲覧可・フードは
// 登録者と認証済み団体のみ」に制限されているため、ここでは直接取得してよい
// （一般ユーザーにはフード場所の行がそもそも返ってこない）。
export default function SpotsList() {
  const router = useRouter()
  const [spots, setSpots] = useState([])
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
      await loadSpots()
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadSpots() {
    const { data, error } = await supabase
      .from("cat_spots")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) { console.log("スポット取得エラー:", error.message); return }
    setSpots(data || [])
  }

  async function handleDelete(s) {
    if (!confirm("このスポットを削除しますか？")) return
    const { error } = await supabase.from("cat_spots").delete().eq("id", s.id)
    if (error) { alert("削除に失敗しました: " + error.message); return }
    setSpots((prev) => prev.filter((x) => x.id !== s.id))
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <PageTitle icon={<MapPin size={20} color="#e07a5f" />} title="スポット一覧" />
        <button onClick={() => router.push("/spots/new")} style={{ ...buttonStyle, display: "flex", alignItems: "center", gap: 4 }}>
          <Plus size={14} /> 登録する
        </button>
      </div>

      <p style={{ color: "#9e7b6e", fontSize: 13, marginBottom: 16 }}>
        トイレ・猫ハウス・フード場所の一覧です。フード場所は毒餌被害防止のため、登録者本人・認証済み団体アカウント・管理者以外（一般・活動者アカウントを含む）には表示されません。
      </p>

      <RegionSelector region={region ?? ""} onChange={changeRegion} />

      {loading && <p style={{ textAlign: "center", color: "#999" }}>読み込み中...</p>}

      {!loading && filterByRegion(spots, region).length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>まだスポットが登録されていません</p>
      )}

      {filterByRegion(spots, region).map((s) => {
        const info = TYPE_INFO[s.type] || { label: s.type, icon: MapPin }
        const Icon = info.icon
        const canDelete = (user && s.created_by === user.id) || profile?.role === "admin"
        return (
          <div key={s.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <span style={{
                fontSize: 12, padding: "3px 10px", borderRadius: 12,
                background: "#f0e6e0", color: "#e07a5f",
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                <Icon size={13} /> {info.label}
              </span>
              {canDelete && (
                <button onClick={() => handleDelete(s)} style={deleteBtn} title="削除する">
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {s.description && (
              <p style={{ margin: "0 0 8px", color: "#444", fontSize: 14 }}>{s.description}</p>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#bbb" }}>
                {new Date(s.created_at).toLocaleDateString("ja-JP")}
                {s.verified && (
                  <span style={{ marginLeft: 8, color: "#43a047", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <CheckCircle2 size={11} /> 確認済み
                  </span>
                )}
              </p>
              {s.lat && s.lng && (
                <a
                  href={`https://www.google.com/maps?q=${s.lat},${s.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: "#1565c0", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <MapPin size={12} /> 地図で確認
                </a>
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
