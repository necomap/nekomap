import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Scissors } from "lucide-react"
import PageTitle from "../../components/PageTitle"

export default function TNRCalendar() {
  const router = useRouter()
  const [schedules, setSchedules] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    loadSchedules()
  }, [currentMonth])

  async function loadSchedules() {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const start = new Date(year, month, 1).toISOString().split("T")[0]
    const end = new Date(year, month + 1, 0).toISOString().split("T")[0]

    const { data } = await supabase
      .from("tnr_schedules")
      .select("*")
      .or(`capture_date.gte.${start},surgery_date.gte.${start},release_date.gte.${start}`)
      .order("capture_date", { ascending: true })
    setSchedules(data || [])
  }

  async function toggleDone(id, done) {
    await supabase.from("tnr_schedules").update({ done: !done }).eq("id", id)
    loadSchedules()
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  function getSchedulesForDay(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return schedules.filter((s) =>
      s.capture_date === dateStr ||
      s.surgery_date === dateStr ||
      s.release_date === dateStr
    )
  }

  function getDayLabel(s, dateStr) {
    if (s.capture_date === dateStr) return { label: "捕獲", color: "#e07a5f" }
    if (s.surgery_date === dateStr) return { label: "手術", color: "#7b61ff" }
    if (s.release_date === dateStr) return { label: "放猫", color: "#43a047" }
    return { label: "", color: "#888" }
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <PageTitle icon={<Scissors size={20} color="#e07a5f" />} title="TNRカレンダー" />
        <button onClick={() => router.push("/tnr/new")} style={buttonStyle}>
          ＋ 予定追加
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={() => setCurrentMonth(new Date(year, month - 1))} style={navButton}>◀</button>
        <h2 style={{ margin: 0 }}>{year}年{month + 1}月</h2>
        <button onClick={() => setCurrentMonth(new Date(year, month + 1))} style={navButton}>▶</button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 12 }}>
        {[
          { label: "捕獲", color: "#e07a5f" },
          { label: "手術", color: "#7b61ff" },
          { label: "放猫", color: "#43a047" },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
            <span style={{ color: "#9e7b6e" }}>{l.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 24 }}>
        {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
          <div key={d} style={{
            textAlign: "center", fontSize: 12, padding: "4px 0",
            color: i === 0 ? "#e07a5f" : i === 6 ? "#4a90e2" : "#9e7b6e",
          }}>{d}</div>
        ))}
        {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
        {Array(daysInMonth).fill(null).map((_, i) => {
          const day = i + 1
          const daySchedules = getSchedulesForDay(day)
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          return (
            <div key={day} style={{
              minHeight: 56, padding: 4, borderRadius: 8,
              background: daySchedules.length > 0 ? "#fff9f5" : "#fafafa",
              border: `1px solid ${daySchedules.length > 0 ? "#f2c4a0" : "#f0f0f0"}`,
              fontSize: 11,
            }}>
              <div style={{
                color: day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()
                  ? "#e07a5f" : "#666",
                fontWeight: day === new Date().getDate() && month === new Date().getMonth() ? 700 : 400,
                marginBottom: 2,
              }}>{day}</div>
              {daySchedules.map((s) => {
                const { label, color } = getDayLabel(s, dateStr)
                return (
                  <div key={`${s.id}-${label}`} style={{
                    background: color, color: "white",
                    borderRadius: 3, padding: "1px 3px",
                    fontSize: 9, marginBottom: 1,
                    cursor: "pointer", opacity: s.done ? 0.5 : 1,
                  }} onClick={() => toggleDone(s.id, s.done)}>
                    {s.cat_name?.slice(0, 4)} {label}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <h3 style={{ marginBottom: 12 }}>今月の予定一覧</h3>
      {schedules.length === 0 && <p style={{ color: "#999" }}>予定はありません</p>}
      {schedules.map((s) => (
        <div key={s.id} style={{ ...cardStyle, opacity: s.done ? 0.6 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 15 }}>
                {s.done ? "✅" : "🐱"} {s.cat_name}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                {s.capture_date && (
                  <span style={tagStyle("#e07a5f")}>📅 捕獲: {s.capture_date}</span>
                )}
                {s.surgery_date && (
                  <span style={tagStyle("#7b61ff")}>🏥 手術: {s.surgery_date}</span>
                )}
                {s.hospital && (
                  <span style={tagStyle("#888")}>🏨 {s.hospital}</span>
                )}
                {s.release_date && (
                  <span style={tagStyle("#43a047")}>🌿 放猫: {s.release_date}</span>
                )}
              </div>
              {s.organization && (
                <p style={{ margin: "0 0 4px", fontSize: 13, color: "#4a90e2" }}>
                  担当: {s.organization}
                </p>
              )}
              {s.note && (
                <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{s.note}</p>
              )}
            </div>
            <button
              onClick={() => toggleDone(s.id, s.done)}
              style={{
                padding: "6px 12px", marginLeft: 8,
                background: s.done ? "#f0e6e0" : "#43a047",
                color: s.done ? "#e07a5f" : "white",
                border: "none", borderRadius: 8,
                fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {s.done ? "未完了に戻す" : "完了"}
            </button>
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
const navButton = {
  padding: "8px 16px", background: "#f0e6e0", border: "none",
  borderRadius: 8, cursor: "pointer", fontSize: 16, fontFamily: "inherit",
}
const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16,
  padding: 16, marginBottom: 12, background: "white",
}
const tagStyle = (color) => ({
  display: "inline-block", padding: "3px 8px",
  background: color + "22", color: color,
  borderRadius: 8, fontSize: 12,
  border: `1px solid ${color}44`,
})
