import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Users } from "lucide-react"
import PageTitle from "../../components/PageTitle"
import { searchAddressCandidates } from "../../lib/geocode"
import "leaflet/dist/leaflet.css"

export default function NewVolunteer() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState("")
  const [candidates, setCandidates] = useState([])
  const [selectedPlace, setSelectedPlace] = useState("")
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
      })
    }
  }, [])

  useEffect(() => {
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

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize()
      }
    }, 500)

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  async function handleGeocodeSearch() {
    if (!location.trim()) return
    setGeocoding(true)
    setGeocodeError("")
    setCandidates([])
    setSelectedPlace("")
    try {
      const results = await searchAddressCandidates(location)
      if (!results.length) { setGeocodeError("見つかりませんでした。表記を変えてお試しください"); return }
      setCandidates(results)
    } catch (e) {
      setGeocodeError("検索に失敗しました: " + e.message)
    } finally {
      setGeocoding(false)
    }
  }

  function selectCandidate(place) {
    setLat(place.lat)
    setLng(place.lng)
    setSelectedPlace(place.displayName)
    setCandidates([])
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([place.lat, place.lng], 16)
      const L = require("leaflet")
      if (markerRef.current) markerRef.current.remove()
      markerRef.current = L.marker([place.lat, place.lng]).addTo(mapInstanceRef.current)
    }
  }

  async function handleSubmit() {
    if (!title) { setError("タイトルを入力してください"); return }
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from("volunteer_requests").insert({
      title, location, description, date,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      created_by: userData.user?.id,
    })
    if (error) { setError("投稿に失敗しました"); setLoading(false); return }
    router.push("/volunteer")
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Users size={20} color="#e07a5f" />} title="ボランティア募集を投稿" />

      <input
        placeholder="タイトル（例：捕獲手伝い募集）（必須）"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={inputStyle}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        <input
          placeholder="場所（例：○○公園・静岡県富士市）"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleGeocodeSearch())}
          style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
        />
        <button type="button" onClick={handleGeocodeSearch} disabled={geocoding} style={searchBtnStyle}>
          {geocoding ? "検索中..." : "🔍 検索"}
        </button>
      </div>
      {geocodeError && <p style={{ color: "red", fontSize: 12, marginBottom: 8 }}>{geocodeError}</p>}

      {candidates.length > 0 && (
        <div style={candidateListStyle}>
          {candidates.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectCandidate(c)}
              style={{ ...candidateItemStyle, borderBottom: i < candidates.length - 1 ? "1px solid #f9ede6" : "none" }}
            >
              📍 {c.displayName}
            </button>
          ))}
        </div>
      )}
      {selectedPlace && (
        <p style={{ fontSize: 12, color: "#43a047", marginBottom: 8 }}>✅ {selectedPlace}</p>
      )}

      <p style={{ fontSize: 11, color: "#bbb", marginBottom: 12 }}>
        場所を入力して「🔍 検索」を押すと候補が出るので、選ぶと下の地図が移動します
      </p>

      <input
        type="datetime-local"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={inputStyle}
      />
      <textarea
        placeholder="内容・詳細を入力してください"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ ...inputStyle, height: 160 }}
      />

      <p style={{ fontSize: 13, color: "#9e7b6e", marginBottom: 8 }}>
        地図をタップして集合場所を指定（任意）
      </p>
      <div ref={mapRef} style={{ width: "100%", height: 240, borderRadius: 12, marginBottom: 8, border: "1px solid #f2c4a0" }} />
      {lat && <p style={{ fontSize: 12, color: "#43a047", marginBottom: 12 }}>✅ 場所を選択済み ({parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)})</p>}

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <button onClick={handleSubmit} disabled={loading} style={buttonStyle}>
        {loading ? "投稿中..." : "投稿する"}
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
const searchBtnStyle = {
  padding: "0 16px", background: "#f0e6e0", color: "#e07a5f",
  border: "none", borderRadius: 12, fontSize: 14, cursor: "pointer",
  fontFamily: "inherit", whiteSpace: "nowrap",
}
const candidateListStyle = {
  marginBottom: 8, border: "1px solid #f2c4a0", borderRadius: 12,
  overflow: "hidden", background: "white",
}
const candidateItemStyle = {
  display: "block", width: "100%", textAlign: "left", padding: "10px 12px",
  border: "none", background: "white", cursor: "pointer",
  fontFamily: "inherit", fontSize: 13, color: "#3d3230",
}
