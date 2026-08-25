import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import dynamic from "next/dynamic"

const CatMap = dynamic(() => import("../../components/CatMap"), { ssr: false })

export default function CatDetail() {
  const router = useRouter()
  const { id } = router.query
  const [cat, setCat] = useState(null)
  const [sightings, setSightings] = useState([])
  const [healthRecords, setHealthRecords] = useState([])
  const [tnrSchedules, setTnrSchedules] = useState([])
  const [territory, setTerritory] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [pendingReports, setPendingReports] = useState([])
  const [showHealthForm, setShowHealthForm] = useState(false)
  const [healthType, setHealthType] = useState("ワクチン")
  const [healthDate, setHealthDate] = useState("")
  const [healthNote, setHealthNote] = useState("")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!id) return
    async function loadAll() {
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData.user)

      if (userData.user) {
        const { data: profileData } = await supabase
          .from("users").select("role").eq("id", userData.user.id).single()
        setProfile(profileData)

        const { data: reportsData } = await supabase
          .from("reports").select("*")
          .eq("target_table", "cats").eq("target_id", id)
          .order("created_at", { ascending: false })
        setPendingReports(reportsData || [])
      }

      const { data: catData, error: catError } = await supabase
        .from("cats").select("*").eq("id", id).single()
      if (catError) console.log("catエラー:", catError.message)
      setCat(catData)

      const { data: sightingData } = await supabase
        .from("sightings").select("*").eq("cat_id", id)
        .order("created_at", { ascending: false })
      setSightings(sightingData || [])

      const { data: healthData } = await supabase
        .from("health_records").select("*").eq("cat_id", id)
        .order("date", { ascending: false })
      setHealthRecords(healthData || [])

      const { data: tnrData } = await supabase
        .from("tnr_schedules").select("*").eq("cat_id", id)
        .order("created_at", { ascending: false })
      setTnrSchedules(tnrData || [])

      const { data: territoryData } = await supabase
        .from("territories").select("*").eq("cat_id", id)
      setTerritory(territoryData?.[0] || null)

      setLoaded(true)
    }
    loadAll()
  }, [id])

  async function addHealthRecord() {
    if (!healthDate) return
    await supabase.from("health_records").insert({
      cat_id: id, type: healthType, date: healthDate,
      note: healthNote, created_by: user?.id,
    })
    setShowHealthForm(false)
    setHealthNote("")
    const { data } = await supabase
      .from("health_records").select("*").eq("cat_id", id)
      .order("date", { ascending: false })
    setHealthRecords(data || [])
  }

  async function markMemorial() {
    if (!confirm(`${cat.name}を訃報として記録しますか？`)) return
    const note = prompt("お別れの言葉やエピソードがあれば入力してください（任意）") || null
    const date = prompt("旅立った日（例: 2026-08-01）。わからなければ空欄でOK") || null
    const { error } = await supabase.from("cats").update({
      memorial: true, memorial_note: note, memorial_date: date,
    }).eq("id", id)
    if (error) { alert("記録に失敗しました: " + error.message); return }
    setCat({ ...cat, memorial: true, memorial_note: note, memorial_date: date })
  }

  async function reportDeath() {
    if (!user) { router.push("/login"); return }
    const reason = prompt("状況を教えてください（例：〇月〇日から姿が見えない、亡くなっているのを見つけた、など）")
    if (!reason) return
    const { error } = await supabase.from("reports").insert({
      target_id: id, target_table: "cats", reason, created_by: user.id,
    })
    if (error) { alert("送信に失敗しました: " + error.message); return }
    alert("登録者に伝わるよう報告しました。ご協力ありがとうございます。")
  }

  async function addTnr() {
    const date = prompt("捕獲予定日を入力してください（例：2026-04-20）")
    if (!date) return
    const { data: userData } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from("users").select("organization, nickname")
      .eq("id", userData.user.id).single()

    await supabase.from("tnr_schedules").insert({
      cat_id: id, cat_name: cat.name,
      capture_date: date,
      schedule_date: date,
      organization: profile?.organization || profile?.nickname || "",
      created_by: userData.user.id,
    })
    alert("TNR予定を登録しました！")
    const { data } = await supabase
      .from("tnr_schedules").select("*").eq("cat_id", id)
      .order("created_at", { ascending: false })
    setTnrSchedules(data || [])
  }

  if (!cat) return (
    <div style={{ textAlign: "center", marginTop: 80 }}>
      <p style={{ color: "#9e7b6e" }}>読み込み中...</p>
    </div>
  )

  const isOwnerOrAdmin = !!user && (user.id === cat.created_by || profile?.role === "admin")

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <button onClick={() => router.back()} style={backBtn}>← 戻る</button>

      {cat.photo ? (
        <img src={cat.photo} alt={cat.name} style={{ width: "100%", height: 240, objectFit: "cover", borderRadius: 16, marginBottom: 16 }} />
      ) : (
        <div style={{ width: "100%", height: 240, background: "#f0e6e0", borderRadius: 16, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>
          🐱
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0, color: "#3d3230" }}>{cat.name}</h1>
        {user && (
          <button onClick={() => router.push(`/cats/${id}/edit`)} style={editBtn}>編集</button>
        )}
      </div>

      {cat.memorial && (
        <div style={memorialBanner}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>
            🕊️ {cat.name}は虹の橋を渡りました
          </p>
          {cat.memorial_date && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9e7b6e" }}>{cat.memorial_date}</p>
          )}
          {cat.memorial_note && (
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "#3d3230", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {cat.memorial_note}
            </p>
          )}
        </div>
      )}

      {!cat.memorial && isOwnerOrAdmin && pendingReports.length > 0 && (
        <div style={reportBanner}>
          <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 13, color: "#e65100" }}>
            ⚠️ {pendingReports.length}件の訃報に関する報告があります
          </p>
          {pendingReports.map((r) => (
            <p key={r.id} style={{ margin: "2px 0", fontSize: 12, color: "#666" }}>・{r.reason}</p>
          ))}
        </div>
      )}

      {!cat.memorial && isOwnerOrAdmin && (
        <button onClick={markMemorial} style={{ ...actionBtn, background: "#6b7280", marginBottom: 16 }}>
          🕊️ 訃報として記録する
        </button>
      )}
      {!cat.memorial && user && !isOwnerOrAdmin && (
        <button onClick={reportDeath} style={{ ...actionBtn, background: "#f0e6e0", color: "#e07a5f", marginBottom: 16 }}>
          訃報の可能性を報告する
        </button>
      )}

      <div style={cardStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {cat.sex && <tr style={rowStyle}><td style={labelStyle}>性別</td><td>{cat.sex}</td></tr>}
            <tr style={rowStyle}><td style={labelStyle}>避妊・去勢</td><td>{cat.neutered ? "✅ 済み" : "未"}</td></tr>
            {cat.features && <tr style={rowStyle}><td style={labelStyle}>特徴</td><td>{cat.features}</td></tr>}
            {cat.notes && <tr style={rowStyle}><td style={labelStyle}>注意事項</td><td style={{ color: "#e07a5f" }}>{cat.notes}</td></tr>}
          </tbody>
        </table>
      </div>

      {user && (
        <button onClick={addTnr} style={{ ...actionBtn, background: "#7b61ff", marginBottom: 16 }}>
          ✂️ TNR予定を登録する
        </button>
      )}

      {tnrSchedules.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={sectionTitle}>✂️ TNR記録</h3>
          {tnrSchedules.map((t) => (
            <div key={t.id} style={{ ...tagStyle, marginBottom: 6 }}>
              <p style={{ margin: "0 0 4px", fontWeight: 500 }}>
                {t.done ? "✅" : "📅"} {t.cat_name}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, fontSize: 12 }}>
                {t.capture_date && <span style={{ color: "#e07a5f" }}>捕獲: {t.capture_date}</span>}
                {t.surgery_date && <span style={{ color: "#7b61ff" }}>手術: {t.surgery_date}</span>}
                {t.hospital && <span style={{ color: "#888" }}>🏥 {t.hospital}</span>}
                {t.release_date && <span style={{ color: "#43a047" }}>放猫: {t.release_date}</span>}
              </div>
              {t.organization && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#4a90e2" }}>{t.organization}</p>}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={sectionTitle}>🏥 健康記録</h3>
          {user && (
            <button onClick={() => setShowHealthForm(!showHealthForm)} style={editBtn}>＋ 追加</button>
          )}
        </div>

        {showHealthForm && (
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <select value={healthType} onChange={(e) => setHealthType(e.target.value)} style={inputStyle}>
              <option>ワクチン</option>
              <option>避妊手術</option>
              <option>去勢手術</option>
              <option>レボリューション</option>
              <option>通院</option>
              <option>その他</option>
            </select>
            <input type="date" value={healthDate} onChange={(e) => setHealthDate(e.target.value)} style={inputStyle} />
            <input placeholder="メモ（任意）" value={healthNote} onChange={(e) => setHealthNote(e.target.value)} style={inputStyle} />
            <button onClick={addHealthRecord} style={actionBtn}>保存</button>
          </div>
        )}

        {healthRecords.length === 0 && <p style={{ color: "#bbb", fontSize: 14 }}>記録はありません</p>}
        {healthRecords.map((h) => (
          <div key={h.id} style={{ ...tagStyle, marginBottom: 6 }}>
            📋 {h.date} {h.type} {h.note && `- ${h.note}`}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={sectionTitle}>👀 目撃履歴・ナワバリ</h3>
        {sightings.length === 0 && !territory && (
          <p style={{ color: "#bbb", fontSize: 14 }}>目撃情報・ナワバリはありません</p>
        )}
        {loaded && (sightings.length > 0 || territory) && (
          <CatMap sightings={sightings} territory={territory} />
        )}
        {sightings.map((s) => (
          <div key={s.id} style={{ ...tagStyle, marginBottom: 6 }}>
            📍 {new Date(s.created_at).toLocaleDateString("ja-JP")}
            {s.description && ` - ${s.description}`}
          </div>
        ))}
      </div>
    </div>
  )
}

const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16,
  padding: 16, marginBottom: 16, background: "white",
}
const rowStyle = { borderBottom: "1px solid #f9ede6" }
const labelStyle = { padding: "10px 0", color: "#9e7b6e", width: 100, fontSize: 14 }
const sectionTitle = { margin: "0 0 8px", color: "#3d3230", fontSize: 16 }
const tagStyle = {
  padding: "8px 12px", background: "#fff9f5",
  borderRadius: 10, fontSize: 14,
  border: "1px solid #f2c4a0",
}
const backBtn = {
  background: "none", border: "none", cursor: "pointer",
  color: "#e07a5f", fontSize: 16, marginBottom: 16, fontFamily: "inherit",
}
const editBtn = {
  padding: "6px 14px", background: "#f0e6e0", color: "#e07a5f",
  border: "none", borderRadius: 20, cursor: "pointer",
  fontSize: 13, fontFamily: "inherit",
}
const actionBtn = {
  display: "block", width: "100%", padding: "12px",
  background: "#e07a5f", color: "white", border: "none",
  borderRadius: 12, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
  marginBottom: 8,
}
const inputStyle = {
  display: "block", width: "100%", padding: "8px 12px",
  marginBottom: 8, border: "1px solid #f2c4a0", borderRadius: 10,
  fontSize: 15, boxSizing: "border-box", fontFamily: "inherit",
}
const memorialBanner = {
  padding: 16, marginBottom: 16, borderRadius: 14,
  background: "#f5f5f5", border: "1px solid #e0e0e0",
}
const reportBanner = {
  padding: 12, marginBottom: 12, borderRadius: 12,
  background: "#fff3e0", border: "1px solid #ffcc80",
}
