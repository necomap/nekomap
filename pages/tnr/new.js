import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

export default function NewTNR() {
  const router = useRouter()
  const [cats, setCats] = useState([])
  const [catId, setCatId] = useState("")
  const [catName, setCatName] = useState("")
  const [captureDate, setCaptureDate] = useState("")
  const [surgeryDate, setSurgeryDate] = useState("")
  const [hospital, setHospital] = useState("")
  const [releaseDate, setReleaseDate] = useState("")
  const [organization, setOrganization] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadData() {
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        const { data: profile } = await supabase
          .from("users").select("nickname, name, organization")
          .eq("id", userData.user.id).single()
        if (profile) {
          setOrganization(profile.organization || profile.nickname || profile.name || "")
        }
      }
      const { data } = await supabase.from("cats").select("id, name")
      setCats(data || [])
    }
    loadData()
  }, [])

  async function handleSubmit() {
    if (!catName && !catId) { setError("猫の名前を入力してください"); return }
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    const selectedCat = cats.find((c) => c.id === catId)

    const { error } = await supabase.from("tnr_schedules").insert({
      cat_id: catId || null,
      cat_name: selectedCat?.name || catName,
      schedule_date: captureDate || surgeryDate || releaseDate,
      capture_date: captureDate || null,
      surgery_date: surgeryDate || null,
      hospital: hospital || null,
      release_date: releaseDate || null,
      organization,
      note,
      created_by: userData.user?.id,
    })

    if (error) { setError("登録に失敗しました: " + error.message); setLoading(false); return }
    router.push("/tnr")
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>✂️ TNR記録を追加</h1>

      <select value={catId} onChange={(e) => setCatId(e.target.value)} style={inputStyle}>
        <option value="">登録済みの猫から選択（任意）</option>
        {cats.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>

      <input
        placeholder="猫の名前（登録なしの場合）"
        value={catName}
        onChange={(e) => setCatName(e.target.value)}
        style={inputStyle}
      />

      <p style={{ fontSize: 13, color: "#9e7b6e", marginBottom: 8, marginTop: 4 }}>捕獲日</p>
      <input type="date" value={captureDate} onChange={(e) => setCaptureDate(e.target.value)} style={inputStyle} />

      <p style={{ fontSize: 13, color: "#9e7b6e", marginBottom: 8 }}>手術日</p>
      <input type="date" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} style={inputStyle} />

      <input
        placeholder="病院名"
        value={hospital}
        onChange={(e) => setHospital(e.target.value)}
        style={inputStyle}
      />

      <p style={{ fontSize: 13, color: "#9e7b6e", marginBottom: 8 }}>リリース日</p>
      <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} style={inputStyle} />

      <input
        placeholder="担当団体・名前（自動入力）"
        value={organization}
        onChange={(e) => setOrganization(e.target.value)}
        style={inputStyle}
      />

      <textarea
        placeholder="備考"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ ...inputStyle, height: 100 }}
      />

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <button onClick={handleSubmit} disabled={loading} style={buttonStyle}>
        {loading ? "登録中..." : "登録する"}
      </button>
      <button onClick={() => router.back()} style={{ ...buttonStyle, background: "#f0e6e0", color: "#e07a5f", marginTop: 8 }}>
        戻る
      </button>
    </div>
  )
}

const inputStyle = {
  display: "block", width: "100%", padding: "10px 12px",
  marginBottom: 12, border: "1px solid #f2c4a0", borderRadius: 12,
  fontSize: 16, boxSizing: "border-box", fontFamily: "inherit",
}
const buttonStyle = {
  display: "block", width: "100%", padding: "12px",
  background: "#e07a5f", color: "white", border: "none",
  borderRadius: 12, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
}