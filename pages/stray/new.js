import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Cat } from "lucide-react"
import PageTitle from "../../components/PageTitle"

export default function NewStray() {
  const router = useRouter()
  const [features, setFeatures] = useState("")
  const [comment, setComment] = useState("")
  const [photo, setPhoto] = useState(null)
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [tnrPlanned, setTnrPlanned] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
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

  async function handleSubmit() {
    if (!features) { setError("見た目の特徴を入力してください"); return }
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
    let tnrBy = null
    if (tnrPlanned && userData.user) {
      const { data: profile } = await supabase
        .from("users").select("organization, nickname, name")
        .eq("id", userData.user.id).single()
      tnrBy = profile?.organization || profile?.nickname || profile?.name || "匿名"
    }

    const { error } = await supabase.from("stray_reports").insert({
      features, comment, photo: photoUrl,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      tnr_planned: tnrPlanned,
      tnr_by: tnrBy,
      created_by: userData.user?.id,
    })

    if (error) { setError("投稿に失敗しました"); setLoading(false); return }
    router.push("/map")
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Cat size={20} color="#e07a5f" />} title="野良猫出没情報を投稿" />

      <textarea
        placeholder="見た目の特徴（毛色・模様・大きさなど）（必須）"
        value={features}
        onChange={(e) => setFeatures(e.target.value)}
        style={{ ...inputStyle, height: 100 }}
      />

      <textarea
        placeholder="コメント（任意）"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        style={{ ...inputStyle, height: 80 }}
      />

      <label style={{ display: "block", marginBottom: 12 }}>
        <span style={{ display: "block", marginBottom: 4, color: "#9e7b6e", fontSize: 13 }}>写真（任意）</span>
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
      </label>

      <p style={{ fontSize: 13, color: "#9e7b6e", marginBottom: 8 }}>
        地図をタップして場所を指定（任意）
      </p>
      <div ref={mapRef} style={{ width: "100%", height: 240, borderRadius: 12, marginBottom: 12, border: "1px solid #f2c4a0" }} />
      {lat && <p style={{ fontSize: 12, color: "#43a047", marginBottom: 12 }}>✅ 場所を選択済み</p>}

      <label style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 16, cursor: "pointer",
        padding: 12, background: tnrPlanned ? "#f0e6ff" : "#fff9f5",
        borderRadius: 12, border: `1px solid ${tnrPlanned ? "#7b61ff" : "#f2c4a0"}`,
      }}>
        <input
          type="checkbox"
          checked={tnrPlanned}
          onChange={(e) => setTnrPlanned(e.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        <div>
          <p style={{ margin: 0, fontWeight: 500 }}>✂️ TNR予定あり</p>
          <p style={{ margin: 0, fontSize: 12, color: "#9e7b6e" }}>チェックすると団体名が表示されます</p>
        </div>
      </label>

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