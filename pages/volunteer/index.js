import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Users } from "lucide-react"
import PageTitle from "../../components/PageTitle"
import { getOrCreateDmRoom } from "../../lib/chatRoom"

export default function Volunteer() {
  const router = useRouter()
  const [requests, setRequests] = useState([])
  const [user, setUser] = useState(null)
  const [applyingId, setApplyingId] = useState(null)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      loadRequests()
    }
    init()
  }, [])

  async function loadRequests() {
    const { data } = await supabase
      .from("volunteer_requests")
      .select("*, users(nickname, organization)")
      .order("created_at", { ascending: false })
    setRequests(data || [])
  }

  async function handleApply(req) {
    if (!user) { router.push("/login"); return }
    if (!req.created_by) { alert("募集者情報が見つかりませんでした"); return }
    if (user.id === req.created_by) return

    setApplyingId(req.id)
    try {
      const roomId = await getOrCreateDmRoom(user.id, req.created_by)
      router.push(`/chat/${roomId}`)
    } catch (e) {
      alert("メッセージ機能の準備に失敗しました: " + e.message)
      setApplyingId(null)
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <PageTitle icon={<Users size={20} color="#e07a5f" />} title="ボランティア募集" />
        <button onClick={() => router.push("/volunteer/new")} style={buttonStyle}>
          ＋ 募集する
        </button>
      </div>

      {requests.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>募集中の案件はありません</p>
      )}

      {requests.map((req) => (
        <div key={req.id} style={cardStyle}>
          <h3 style={{ margin: "0 0 8px" }}>{req.title}</h3>
          {(req.users?.nickname || req.users?.organization) && (
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#9e7b6e" }}>
              🙋 {req.users?.nickname || "匿名"}
              {req.users?.organization && (
                <span style={{ color: "#4a90e2" }}> ・ 🏢{req.users.organization}</span>
              )}
            </p>
          )}
          {req.location && (
            <p style={{ margin: "0 0 4px", fontSize: 14, color: "#666" }}>
              📍 {req.location}
            </p>
          )}
          {req.date && (
            <p style={{ margin: "0 0 4px", fontSize: 14, color: "#666" }}>
              📅 {new Date(req.date).toLocaleString("ja-JP")}
            </p>
          )}
          {req.description && (
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "#444" }}>
              {req.description}
            </p>
          )}
          {req.lat && req.lng && (
            <a
              href={`https://www.google.com/maps?q=${req.lat},${req.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={mapLinkStyle}
            >
              📍 地図で場所を確認する
            </a>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#bbb" }}>
              {new Date(req.created_at).toLocaleDateString("ja-JP")}
            </p>
            {req.created_by && user?.id !== req.created_by && (
              <button onClick={() => handleApply(req)} disabled={applyingId === req.id} style={applyButton}>
                {applyingId === req.id ? "準備中..." : "💬 応募する・コンタクトを取る"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const buttonStyle = {
  padding: "10px 20px", background: "#e07a5f", color: "white",
  border: "none", borderRadius: 20, fontSize: 14, cursor: "pointer",
  fontFamily: "inherit",
}
const applyButton = {
  padding: "8px 16px", background: "#43a047", color: "white",
  border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer",
  fontFamily: "inherit",
}
const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16, padding: 16, marginBottom: 16,
  background: "white",
}
const mapLinkStyle = {
  display: "inline-block", marginBottom: 12, fontSize: 13,
  color: "#1565c0", textDecoration: "none",
}
