import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { MapPin, Cat, Trash2 } from "lucide-react"
import PageTitle from "../../components/PageTitle"

// 目撃情報の一覧ページ。
// 位置情報のぼかしをサーバー側(DB関数)で保証するため、生テーブルではなく
// get_blurred_sightings RPC経由で取得する（他ページ・地図と同じ方式）。
export default function SightingsList() {
  const router = useRouter()
  const [sightings, setSightings] = useState([])
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData.user)
      if (userData.user) {
        const { data: p } = await supabase
          .from("users").select("role").eq("id", userData.user.id).single()
        setProfile(p)
      }
      await loadSightings()
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadSightings() {
    const { data, error } = await supabase.rpc("get_blurred_sightings")
    if (error) { console.log("目撃情報取得エラー:", error.message); return }
    setSightings((data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
  }

  async function handleDelete(s) {
    if (!confirm("この目撃情報を削除しますか？")) return
    const { error } = await supabase.from("sightings").delete().eq("id", s.id)
    if (error) { alert("削除に失敗しました: " + error.message); return }
    setSightings((prev) => prev.filter((x) => x.id !== s.id))
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <PageTitle icon={<MapPin size={20} color="#e07a5f" />} title="目撃情報一覧" />
        <button onClick={() => router.push("/sightings/new")} style={buttonStyle}>
          ＋ 追加
        </button>
      </div>

      {loading && <p style={{ textAlign: "center", color: "#999" }}>読み込み中...</p>}

      {!loading && sightings.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>まだ目撃情報がありません</p>
      )}

      {sightings.map((s) => {
        const canDelete = (user && s.created_by === user.id) || profile?.role === "admin"
        return (
          <div key={s.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              {s.cat_id ? (
                <span
                  onClick={() => router.push(`/cats/${s.cat_id}`)}
                  style={{ fontWeight: 600, fontSize: 15, color: "#e07a5f", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Cat size={15} /> {s.cat_name || "地域猫"}
                </span>
              ) : (
                <span style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                  <Cat size={15} color="#c4a090" /> 未登録の猫
                </span>
              )}
              {canDelete && (
                <button onClick={() => handleDelete(s)} style={deleteBtn} title="削除する">
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {s.description && (
              <p style={{ margin: "0 0 8px", color: "#444", fontSize: 14 }}>{s.description}</p>
            )}
            {s.photo && (
              <img src={s.photo} style={{ width: "100%", borderRadius: 8, marginBottom: 8 }} />
            )}

            <p style={{ margin: 0, fontSize: 12, color: "#bbb" }}>
              {new Date(s.created_at).toLocaleDateString("ja-JP")}
            </p>
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
