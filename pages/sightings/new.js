import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { checkPostLimit } from "../../lib/checkPostLimit"
import { MapPin } from "lucide-react"
import PageTitle from "../../components/PageTitle"
import CatMatchSuggestions from "../../components/CatMatchSuggestions"
import { geocodeAddress } from "../../lib/geocode"
import "leaflet/dist/leaflet.css"

export default function NewSighting() {
  const router = useRouter()
  const [catId, setCatId] = useState("")
  const [cats, setCats] = useState([])
  const [description, setDescription] = useState("")
  const [photo, setPhoto] = useState(null)
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [placeQuery, setPlaceQuery] = useState("")
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState("")
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    async function loadCats() {
      const { data } = await supabase.from("cats").select("id, name")
      setCats(data || [])
    }
    loadCats()

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
    if (!placeQuery.trim()) return
    setGeocoding(true)
    setGeocodeError("")
    try {
      const result = await geocodeAddress(placeQuery)
      if (!result) { setGeocodeError("見つかりませんでした。表記を変えてお試しください"); return }
      setLat(result.lat)
      setLng(result.lng)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([result.lat, result.lng], 16)
        const L = require("leaflet")
        if (markerRef.current) markerRef.current.remove()
        markerRef.current = L.marker([result.lat, result.lng]).addTo(mapInstanceRef.current)
      }
    } catch (e) {
      setGeocodeError("検索に失敗しました: " + e.message)
    } finally {
      setGeocoding(false)
    }
  }

  async function handleSubmit() {
    const limit = await checkPostLimit("sightings")
    if (!limit.ok) { setError(limit.message); return }
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
    const { error } = await supabase.from("sightings").insert({
      cat_id: catId || null,
      description,
      photo: photoUrl,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      created_by: userData.user?.id,
    })

    if (error) { setError("投稿に失敗しました: " + error.message); setLoading(false); return }
    router.push("/map")
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<MapPin size={20} color="#e07a5f" />} title="目撃情報を投稿" />

      <select value={catId} onChange={(e) => setCatId(e.target.value)} style={inputStyle}>
        <option value="">猫を選択（任意）</option>
        {cats.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>

      <textarea
        placeholder="どこで見かけましたか？コメントを入力"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ ...inputStyle, height: 100 }}
      />

      <label style={{ display: "block", marginBottom: 12 }}>
        <span style={{ display: "block", marginBottom: 4, color: "#9e7b6e", fontSize: 13 }}>写真（任意）</span>
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
      </label>

      <CatMatchSuggestions
        photo={photo}
        selectedCatId={catId}
        onSelect={(cat) => setCatId(cat.id)}
      />

      <p style={{ fontSize: 13, color: "#9e7b6e", marginBottom: 8 }}>
        住所・ランドマーク名で検索するか、地図をタップして場所を指定（任意）
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          placeholder="住所・ランドマーク名で検索（例：渋谷駅）"
          value={placeQuery}
          onChange={(e) => setPlaceQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleGeocodeSearch())}
          style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
        />
        <button type="button" onClick={handleGeocodeSearch} disabled={geocoding} style={searchBtnStyle}>
          {geocoding ? "検索中..." : "🔍 検索"}
        </button>
      </div>
      {geocodeError && <p style={{ color: "red", fontSize: 12, marginBottom: 8 }}>{geocodeError}</p>}
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