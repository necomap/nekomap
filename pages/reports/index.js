import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

const TYPE_LABELS = {
  feces: "💩 糞尿被害",
  fight: "🐾 けんか多発",
  injury: "🩹 怪我・病気",
  other: "❓ その他",
}

const STATUS_COLORS = {
  未対応: { bg: "#fff3e0", color: "#e65100" },
  対応中: { bg: "#e3f2fd", color: "#1565c0" },
  解決: { bg: "#e8f5e9", color: "#2e7d32" },
}

export default function Reports() {
  const router = useRouter()
  const [reports, setReports] = useState([])
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData.user)
      if (userData.user) {
        const { data: p } = await supabase
          .from("users").select("nickname, name, organization, account_type, role")
          .eq("id", userData.user.id).single()
        setProfile(p)
      }
      loadReports()
    }
    init()
  }, [])

  async function loadReports() {
    const { data } = await supabase
      .from("trouble_reports")
      .select("*")
      .order("created_at", { ascending: false })
    setReports(data || [])
  }

  async function handleVolunteer(report) {
    if (!user) { router.push("/login"); return }
    const volunteerName = profile?.organization || profile?.nickname || profile?.name || "匿名"

    const { error } = await supabase.from("trouble_reports").update({
      status: "対応中",
      volunteer_name: volunteerName,
      volunteer_id: user.id,
    }).eq("id", report.id)

    if (error) {
      alert("エラーが発生しました: " + error.message)
      return
    }

    alert(`${volunteerName}として対応登録しました！`)
    loadReports()
  }

  async function handleResolve(id) {
    const action = prompt("解決内容・対策を入力してください")
    if (!action) return
    await supabase.from("trouble_reports").update({
      status: "解決",
      action,
      action_at: new Date().toISOString(),
    }).eq("id", id)
    loadReports()
  }

  const filtered = reports.filter((r) => {
    if (filter === "all") return true
    return r.status === filter
  })

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>⚠️ 困りごとマップ</h1>
        <button onClick={() => router.push("/reports/new")} style={buttonStyle}>
          ＋ 報告する
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {["all", "未対応", "対応中", "解決"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "6px 12px", borderRadius: 20, fontSize: 13,
              border: "none", cursor: "pointer", fontFamily: "inherit",
              background: filter === s ? "#e07a5f" : "#f0e6e0",
              color: filter === s ? "white" : "#3d3230",
            }}
          >
            {s === "all" ? "すべて" : s}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>該当する報告はありません</p>
      )}

      {filtered.map((report) => (
        <div key={report.id} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{TYPE_LABELS[report.type] || report.type}</span>
            <span style={{
              fontSize: 12, padding: "3px 10px", borderRadius: 12,
              background: STATUS_COLORS[report.status]?.bg || "#f5f5f5",
              color: STATUS_COLORS[report.status]?.color || "#666",
            }}>
              {report.status}
            </span>
          </div>

          {report.description && (
            <p style={{ margin: "0 0 8px", color: "#444", fontSize: 14 }}>{report.description}</p>
          )}
          {report.photo && (
            <img src={report.photo} style={{ width: "100%", borderRadius: 8, marginBottom: 8 }} />
          )}

          {report.volunteer_name && (
            <div style={{
              padding: "8px 12px", background: "#e3f2fd",
              borderRadius: 8, marginBottom: 8, fontSize: 13,
            }}>
              🙋 <b>{report.volunteer_name}</b> が対応中
            </div>
          )}

          {report.action && (
            <div style={{
              padding: "8px 12px", background: "#e8f5e9",
              borderRadius: 8, marginBottom: 8, fontSize: 13,
            }}>
              ✅ 解決内容: {report.action}
            </div>
          )}

          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#bbb" }}>
            {new Date(report.created_at).toLocaleDateString("ja-JP")}
            {report.address && ` ・ ${report.address}`}
          </p>

          {user && report.status === "未対応" && (
            <button
              onClick={() => handleVolunteer(report)}
              style={volunteerBtn}
            >
              🙋 対応します
            </button>
          )}

          {user && report.status === "対応中" && report.volunteer_id === user.id && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => handleResolve(report.id)}
                style={{ ...volunteerBtn, background: "#43a047", flex: 1 }}
              >
                ✅ 解決済みにする
              </button>
              <button
                onClick={async () => {
                  if (!confirm("対応をキャンセルしますか？")) return
                  await supabase.from("trouble_reports").update({
                    status: "未対応",
                    volunteer_name: null,
                    volunteer_id: null,
                  }).eq("id", report.id)
                  loadReports()
                }}
                style={{ ...volunteerBtn, background: "#f0e6e0", color: "#e07a5f", flex: 1 }}
              >
                キャンセル
              </button>
            </div>
          )}

          {user && report.status === "対応中" &&
            report.volunteer_id !== user.id &&
            profile?.role === "admin" && (
            <button
              onClick={() => handleResolve(report.id)}
              style={{ ...volunteerBtn, background: "#43a047" }}
            >
              ✅ 解決済みにする（管理者）
            </button>
          )}
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
const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16,
  padding: 16, marginBottom: 16, background: "white",
}
const volunteerBtn = {
  display: "block", width: "100%", padding: "10px",
  background: "#1565c0", color: "white", border: "none",
  borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
}