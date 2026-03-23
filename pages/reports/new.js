import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { checkPostLimit } from "../../lib/checkPostLimit"
import { AlertTriangle } from "lucide-react"
import PageTitle from "../../components/PageTitle"

const TYPES = [
  { value: "feces", label: "💩 糞尿被害" },
  { value: "fight", label: "🐾 けんか多発" },
  { value: "injury", label: "🩹 怪我・病気" },
  { value: "other", label: "❓ その他" },
]

export default function NewReport() {
  const router = useRouter()
  const [type, setType] = useState("")
  const [description, setDescription] = useState("")
  const [photo, setPhoto] = useState(null)
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [address, setAddress] = useState("")
  const [locationMode, setLocationMode] = useState("gps")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude)
          setLng(pos.coords.longitude)
        },
        () => {
          setLocationMode("map")
        }
      )
    }
  }, [])

  useEffect(() => {
    if (locationMode !== "map") return
    if (!mapRef.current) return
    if (mapInstanceRef.current) return

    const L = require("leaflet")
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    })

    const map = L.map(mapRef.current).setView([35.681, 139.767], 13)
    mapInstanceRef.current = map
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map)

    map.on("click", (e) => {
      setLat(e.latlng.lat)
      setLng(e.latlng.lng)
      if (markerRef.current) markerRef.current.remove()
      markerRef.current = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map)
    })

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [locationMode])

  async function handleSubmit() {
    const limit = await checkPostLimit("trouble_reports")
    if (!limit.ok) { setError(limit.message); return }
    if (!type) { setError("種類を選択してください"); return }
    if (!lat && !address) { setError("位置情報か住所を入力してください"); return }
    setLoading(true)
    let photoUrl = null

    if (photo) {
      const fileName = `${Date.now()}_${photo.name}`
      const { error: uploadError } = await supabase.storage
        .from("cat-photos").upload(fileName, photo)
      if (!uploadError) {
        const { data } = supabase.storage.from("cat-photos").getPublicUrl(fileName)
        photoUrl = data.publicUrl
      }
    }

    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from("trouble_reports").insert({
      type,
      description,
      photo: photoUrl,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      address,
      created_by: userData.user?.id,
    })

    if (error) { setError("投稿に失敗しました"); setLoading(false); return }
    router.push("/reports")
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<AlertTriangle size={20} color="#e07a5f" />} title="困りごとを報告" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            style={{
              padding: "12px 8px", borderRadius: 10, fontFamily: "inherit",
              border: type === t.value ? "2px solid #e07a5f" : "2px solid #f2c4a0",
              background: type === t.value ? "#fff0e8" : "white",
              cursor: "pointer", fontSize: 14,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <textarea
        placeholder="詳しい状況を教えてください"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ ...inputStyle, height: 100 }}
      />

      <label style={{ display: "block", marginBottom: 12 }}>
        <span style={{ display: "block", marginBottom: 4, color: "#9e7b6e", fontSize: 13 }}>写真（任意）</span>
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
      </label>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["gps", "map", "address"].map((mode) => (
          <button
            key={mode}
            onClick={() => setLocationMode(mode)}
            style={{
              flex: 1, padding: "8px", borderRadius: 8, fontSize: 13,
              border: locationMode === mode ? "2px solid #e07a5f" : "2px solid #f2c4a0",
              background: locationMode === mode ? "#fff0e8" : "white",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {mode === "gps" ? "📍 GPS" : mode === "map" ? "🗺️ 地図" : "✏️ 住所"}
          </button>
        ))}
      </div>

      {locationMode === "gps" && (
        <p style={{ fontSize: 13, color: lat ? "#2e7d32" : "#999", marginBottom: 12 }}>
          {lat ? `✅ 位置取得済み (${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)})` : "位置情報を取得中..."}
        </p>
      )}

      {locationMode === "map" && (
        <>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>地図をタップして場所を指定してください</p>
          <div ref={mapRef} style={{ width: "100%", height: 240, borderRadius: 12, marginBottom: 12, border: "1px solid #f2c4a0" }} />
          {lat && <p style={{ fontSize: 12, color: "#2e7d32", marginBottom: 12 }}>✅ 選択済み</p>}
        </>
      )}

      {locationMode === "address" && (
        <input
          placeholder="住所・地名を入力（例: 静岡県富士市○○公園）"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={inputStyle}
        />
      )}

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <button onClick={handleSubmit} disabled={loading} style={buttonStyle}>
        {loading ? "投稿中..." : "報告する"}
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
