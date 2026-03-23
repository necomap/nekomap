import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

export default function Volunteer() {
  const router = useRouter()
  const [requests, setRequests] = useState([])
  const [user, setUser] = useState(null)

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
      .select("*")
      .order("created_at", { ascending: false })
    setRequests(data || [])
  }

  async function handleApply(requestId) {
    if (!user) { router.push("/login"); return }
    const message = prompt("応募メッセージを入力してください（任意）")
    if (message === null) return

    await supabase.from("volunteer_applications").insert({
      request_id: requestId,
      applicant: user.id,
      message,
    })
    alert("応募しました！")
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>🙋 ボランティア募集</h1>
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
          {req.location && (
            <p style={{ margin: "0 0 4px", fontSize: 14, color: "#666" }}>
              📍 {req.location}
            </p>
          )}
          {req.date && (
            <p style={{ margin: "0 0 4px", fontSize: 14, color: "#666" }}>
              📅 {req.date}
            </p>
          )}
          {req.description && (
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "#444" }}>
              {req.description}
            </p>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#bbb" }}>
              {new Date(req.created_at).toLocaleDateString("ja-JP")}
            </p>
            <button onClick={() => handleApply(req.id)} style={applyButton}>
              応募する
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const buttonStyle = {
  padding: "10px 20px", background: "#4a90e2", color: "white",
  border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer",
}
const applyButton = {
  padding: "8px 16px", background: "#43a047", color: "white",
  border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer",
}
const cardStyle = {
  border: "1px solid #eee", borderRadius: 12, padding: 16, marginBottom: 16,
}