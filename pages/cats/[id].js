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
  const [showMemorialForm, setShowMemorialForm] = useState(false)
  const [memorialNote, setMemorialNote] = useState("")
  const [memorialDate, setMemorialDate] = useState("")
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportReason, setReportReason] = useState("")

  useEffect(() => {
    if (!id) return
    async function loadAll() {
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData.user)

      if (userData.user) {
        const { data: profileData } = await supabase
          .from("users").select("role, account_type").eq("id", userData.user.id).single()
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

  async function submitMemorial() {
    const note = memorialNote.trim() || null
    const date = memorialDate || null
    const { error } = await supabase.from("cats").update({
      memorial: true, memorial_note: note, memorial_date: date,
    }).eq("id", id)
    if (error) { alert("記録に失敗しました: " + error.message); return }
    setCat({ ...cat, memorial: true, memorial_note: note, memorial_date: date })
    setShowMemorialForm(false)
  }

  async function submitReportDeath() {
    if (!user) { router.push("/login"); return }
    const reason = reportReason.trim()
    if (!reason) return
    const { error } = await supabase.from("reports").insert({
      target_id: id, target_table: "cats", reason, created_by: user.id,
    })
    if (error) { alert("送信に失敗しました: " + error.message); return }
    setReportReason("")
    setShowReportForm(false)
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

  async function editTnr(t) {
    const captureDate = prompt("捕獲予定日/実施日", t.capture_date || "")
    if (captureDate === null) return
    const surgeryDate = prompt("手術日（任意・空欄可）", t.surgery_date || "")
    if (surgeryDate === null) return
    const hospital = prompt("病院名（任意・空欄可）", t.hospital || "")
    if (hospital === null) return
    const releaseDate = prompt("放猫日（任意・空欄可）", t.release_date || "")
    if (releaseDate === null) return
    const done = t.done || confirm("TNR完了として記録しますか？")

    const { error } = await supabase.from("tnr_schedules").update({
      capture_date: captureDate || null,
      surgery_date: surgeryDate || null,
      hospital: hospital || null,
      release_date: releaseDate || null,
      done,
    }).eq("id", t.id)
    if (error) { alert("更新に失敗しました: " + error.message); return }

    const { data } = await supabase
      .from("tnr_schedules").select("*").eq("cat_id", id)
      .order("created_at", { ascending: false })
    setTnrSchedules(data || [])
  }

  async function deleteTnr(t) {
    if (!confirm("このTNR記録を削除しますか？")) return
    const { error } = await supabase.from("tnr_schedules").delete().eq("id", t.id)
    if (error) { alert("削除に失敗しました: " + error.message); return }
    setTnrSchedules(tnrSchedules.filter((x) => x.id !== t.id))
  }

  if (!cat) return (
    <div style={{ textAlign: "center", marginTop: 80 }}>
      <p style={{ color: "#9e7b6e" }}>読み込み中...</p>
    </div>
  )

  const isOwnerOrAdmin = !!user && (user.id === cat.created_by || profile?.role === "admin")
  // 目撃地点マップの位置ぼかし判定に使う（管理者・団体以外はぼかす）
  const mapUserType = profile?.role === "admin" ? "admin" : profile?.account_type || "general"

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

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={sectionTitle}>✂️ TNR記録</h3>
          {user && (
            <button onClick={addTnr} style={editBtn}>＋ 追加</button>
          )}
        </div>

        {tnrSchedules.length === 0 && <p style={{ color: "#bbb", fontSize: 14 }}>記録はありません</p>}

        {tnrSchedules.map((t) => (
          <div key={t.id} style={{ ...tagStyle, marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
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
              {user && (user.id === t.created_by || profile?.role === "admin") && (
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => editTnr(t)} style={smallBtn}>編集</button>
                  <button onClick={() => deleteTnr(t)} style={{ ...smallBtn, color: "#e05252", borderColor: "#f5c2c2" }}>削除</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

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
          <CatMap sightings={sightings} territory={territory} userType={mapUserType} />
        )}
        {!["admin", "organization"].includes(mapUserType) && sightings.some((s) => s.lat && s.lng) && (
          <p style={{ fontSize: 11, color: "#999", margin: "4px 0 0" }}>※地図上の位置は約100mぼかしています</p>
        )}
        {sightings.map((s) => (
          <div key={s.id} style={{ ...tagStyle, marginBottom: 6 }}>
            📍 {new Date(s.created_at).toLocaleDateString("ja-JP")}
            {s.description && ` - ${s.description}`}
          </div>
        ))}
      </div>

      {!cat.memorial && isOwnerOrAdmin && (
        <div style={{ marginTop: 32 }}>
          <button onClick={() => setShowMemorialForm(!showMemorialForm)} style={smallGhostBtn}>
            🕊️ 訃報として記録する
          </button>

          {showMemorialForm && (
            <div style={{ ...cardStyle, marginTop: 12 }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#666", lineHeight: 1.6 }}>
                {cat.name}を訃報として記録します。通常の一覧からは外れ、訃報ページに掲載されます。
              </p>
              <textarea
                placeholder="お別れの言葉やエピソード（任意）"
                value={memorialNote}
                onChange={(e) => setMemorialNote(e.target.value)}
                style={{ ...inputStyle, height: 80 }}
              />
              <label style={{ display: "block", marginBottom: 12 }}>
                <span style={{ display: "block", marginBottom: 4, color: "#9e7b6e", fontSize: 13 }}>
                  旅立った日（任意・わからなければ空欄でOK）
                </span>
                <input
                  type="date"
                  value={memorialDate}
                  onChange={(e) => setMemorialDate(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0 }}
                />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={submitMemorial} style={{ ...actionBtn, marginBottom: 0, background: "#6b7280" }}>
                  記録する
                </button>
                <button
                  onClick={() => { setShowMemorialForm(false); setMemorialNote(""); setMemorialDate("") }}
                  style={{ ...actionBtn, marginBottom: 0, background: "#f0e6e0", color: "#e07a5f" }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!cat.memorial && user && !isOwnerOrAdmin && (
        <div style={{ marginTop: 32 }}>
          <button onClick={() => setShowReportForm(!showReportForm)} style={smallGhostBtn}>
            訃報の可能性を報告する
          </button>

          {showReportForm && (
            <div style={{ ...cardStyle, marginTop: 12 }}>
              <textarea
                placeholder="状況を教えてください（例：〇月〇日から姿が見えない、亡くなっているのを見つけた、など）"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                style={{ ...inputStyle, height: 80 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={submitReportDeath} disabled={!reportReason.trim()} style={{ ...actionBtn, marginBottom: 0 }}>
                  報告する
                </button>
                <button
                  onClick={() => { setShowReportForm(false); setReportReason("") }}
                  style={{ ...actionBtn, marginBottom: 0, background: "#f0e6e0", color: "#e07a5f" }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      )}
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
const smallBtn = {
  padding: "4px 10px", background: "white", color: "#9e7b6e",
  border: "1px solid #f2c4a0", borderRadius: 8, cursor: "pointer",
  fontSize: 11, fontFamily: "inherit", whiteSpace: "nowrap",
}
const smallGhostBtn = {
  display: "block", margin: "32px auto 0", padding: "8px 18px",
  background: "none", color: "#9e9e9e", border: "1px solid #e0e0e0",
  borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
}
