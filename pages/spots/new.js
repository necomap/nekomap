import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

const TYPES = [
  { value: "toilet", label: "🚽 トイレ" },
  { value: "house", label: "🏠 猫ハウス" },
  { value: "food", label: "🍚 フード場所" },
]

export default function NewSpot() {
  const router = useRouter()
  const [type, setType] = useState("")
  const [description, setDescription] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current) return
    if (mapRef.current._leaflet_id) return

    const L = require("leaflet")
    const map = L.map(mapRef.current).setView([35.681, 139.767], 13)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map)

    map.on("click", (e) => {
      setLat(e.latlng.lat)
      setLng(e.latlng.lng)
      if (markerRef.current) markerRef.current.remove()
      markerRef.current = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map)
    })

    return () => {
      map.remove()
    }
  }, [])

  async function handleSubmit() {
    if (!type) { setError("種類を選択してください"); return }
    if (!lat) { setError("地図をタップして場所を選択してください"); return }

    // フード場所の場合は警告表示
    if (type === "food") {
      const ok = confirm("⚠️ フード場所の登録について\n\n悪意のある人物による毒餌被害を防ぐため、正確な位置は登録者と認証済み団体のみに表示されます。\n\n登録を続けますか？")
      if (!ok) return
    }

    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from("cat_spots").insert({
      type, description,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      created_by: userData.user?.id,
    })

    if (error) { setError("登録に失敗しました"); setLoading(false); return }
    router.push("/map")
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>📍 スポットを登録</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            style={{
              padding: "12px 8px", borderRadius: 10, fontFamily: "inherit",
              border: type === t.value ? "2px solid #e07a5f" : "2px solid #eee",
              background: type === t.value ? "#fff0e8" : "white",
              cursor: "pointer", fontSize: 13,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {type === "food" && (
        <div style={{ padding: 12, background: "#fff3e0", borderRadius: 10, marginBottom: 12, fontSize: 13, color: "#e65100" }}>
          ⚠️ フード場所は毒餌被害防止のため、正確な位置は認証済み団体のみに表示されます
        </div>
      )}

      <textarea
        placeholder="説明（任意）"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ ...inputStyle, height: 80 }}
      />

      <p style={{ fontSize: 13, color: "#9e7b6e", marginBottom: 8 }}>
        地図をタップして場所を指定してください
      </p>
      <div ref={mapRef} style={{ width: "100%", height: 240, borderRadius: 12, marginBottom: 12, border: "1px solid #f2c4a0" }} />
      {lat && <p style={{ fontSize: 12, color: "#43a047", marginBottom: 12 }}>✅ 場所を選択済み</p>}

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <button onClick={handleSubmit} disabled={loading} style={buttonStyle}>
        {loading ? "登録中..." : "登録する"}
      </button>
      <button onClick={() => router.back()} style={{ ...buttonStyle, background: "#999", marginTop: 8 }}>
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