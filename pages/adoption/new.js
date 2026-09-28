import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { checkPostLimit } from "../../lib/checkPostLimit"
import { Home } from "lucide-react"
import PageTitle from "../../components/PageTitle"
import { searchAddressCandidates, reverseGeocodeToPrefecture } from "../../lib/geocode"
import { compressImage } from "../../lib/compressImage"
import { PREFECTURES } from "../../lib/prefectures"
import "leaflet/dist/leaflet.css"

export default function NewAdoption() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [catId, setCatId] = useState("")
  const [cats, setCats] = useState([])
  const [name, setName] = useState("")
  const [sex, setSex] = useState("")
  const [neutered, setNeutered] = useState(false)
  const [ageNote, setAgeNote] = useState("")
  const [features, setFeatures] = useState("")
  const [healthNote, setHealthNote] = useState("")
  const [description, setDescription] = useState("")
  const [feeAmount, setFeeAmount] = useState("0")
  const [feeNote, setFeeNote] = useState("")
  const [photo, setPhoto] = useState(null)
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [prefecture, setPrefecture] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [placeQuery, setPlaceQuery] = useState("")
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState("")
  const [candidates, setCandidates] = useState([])
  const [selectedPlace, setSelectedPlace] = useState("")
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { router.push("/login"); return }
      setCheckingAuth(false)
    }
    init()

    async function loadCats() {
      const { data } = await supabase.from("cats").select("id, name")
      setCats(data || [])
    }
    loadCats()
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
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize()
    }, 500)

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!catId) return
    const cat = cats.find((c) => c.id === catId)
    if (cat && !name) setName(cat.name)
  }, [catId, cats])

  // 位置が確定するたびに、都道府県を自動判定する（手動で選び直すこともできる）
  useEffect(() => {
    if (!lat || !lng) return
    let cancelled = false
    reverseGeocodeToPrefecture(lat, lng).then((pref) => {
      if (!cancelled && pref) setPrefecture(pref)
    })
    return () => { cancelled = true }
  }, [lat, lng])

  async function handleGeocodeSearch() {
    if (!placeQuery.trim()) return
    setGeocoding(true)
    setGeocodeError("")
    setCandidates([])
    setSelectedPlace("")
    try {
      const results = await searchAddressCandidates(placeQuery)
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
    setError("")
    if (!name.trim()) { setError("名前（呼び名）を入力してください"); return }

    const limit = await checkPostLimit("adoptions")
    if (!limit.ok) { setError(limit.message); return }
    setLoading(true)

    let photoUrl = null
    if (photo) {
      const compressedPhoto = await compressImage(photo)
      const fileName = `${Date.now()}_${compressedPhoto.name}`
      const { error: uploadError } = await supabase.storage
        .from("cat-photos").upload(fileName, compressedPhoto)
      if (!uploadError) {
        const { data } = supabase.storage.from("cat-photos").getPublicUrl(fileName)
        photoUrl = data.publicUrl
      }
    }

    const { data: userData } = await supabase.auth.getUser()
    const { error: insertError } = await supabase.from("adoptions").insert({
      cat_id: catId || null,
      name,
      sex,
      neutered,
      age_note: ageNote,
      features,
      health_note: healthNote,
      description,
      fee_amount: parseInt(feeAmount, 10) || 0,
      fee_note: feeNote,
      photo: photoUrl,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      prefecture: prefecture || null,
      created_by: userData.user?.id,
    })

    if (insertError) { setError("投稿に失敗しました: " + insertError.message); setLoading(false); return }
    router.push("/adoption")
  }

  if (checkingAuth) return null

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Home size={20} color="#e07a5f" />} title="里親募集を投稿する" />
      <p style={{ fontSize: 13, color: "#9e7b6e", marginBottom: 16 }}>
        新しい飼い主を探している猫の情報を掲載します。閲覧・コンタクトはログインなしでも可能ですが、
        投稿にはログインが必要です。
      </p>

      <select value={catId} onChange={(e) => setCatId(e.target.value)} style={inputStyle}>
        <option value="">登録済みの猫と紐付ける（任意）</option>
        {cats.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>

      <input
        placeholder="名前・呼び名（必須）"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />

      <select value={sex} onChange={(e) => setSex(e.target.value)} style={inputStyle}>
        <option value="">性別を選択</option>
        <option value="オス">オス</option>
        <option value="メス">メス</option>
        <option value="不明">不明</option>
      </select>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <input type="checkbox" checked={neutered} onChange={(e) => setNeutered(e.target.checked)} />
        避妊・去勢手術済み
      </label>

      <input
        placeholder="推定年齢（例：推定2歳、任意）"
        value={ageNote}
        onChange={(e) => setAgeNote(e.target.value)}
        style={inputStyle}
      />

      <textarea
        placeholder="特徴（毛色・模様・性格など）"
        value={features}
        onChange={(e) => setFeatures(e.target.value)}
        style={{ ...inputStyle, height: 80 }}
      />

      <textarea
        placeholder="健康状態（ワクチン接種状況・持病など、任意）"
        value={healthNote}
        onChange={(e) => setHealthNote(e.target.value)}
        style={{ ...inputStyle, height: 80 }}
      />

      <textarea
        placeholder="里親を探している理由・猫の様子など"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ ...inputStyle, height: 100 }}
      />

      <label style={{ display: "block", marginBottom: 4, color: "#9e7b6e", fontSize: 13 }}>
        負担金額（円。無料の場合は0のまま）
      </label>
      <input
        type="number"
        min="0"
        placeholder="0"
        value={feeAmount}
        onChange={(e) => setFeeAmount(e.target.value)}
        style={inputStyle}
      />
      <textarea
        placeholder="負担金額の説明（例：ワクチン・検査代を含む、ご相談可、など。任意）"
        value={feeNote}
        onChange={(e) => setFeeNote(e.target.value)}
        style={{ ...inputStyle, height: 60 }}
      />

      <label style={{ display: "block", marginBottom: 12 }}>
        <span style={{ display: "block", marginBottom: 4, color: "#9e7b6e", fontSize: 13 }}>写真（任意）</span>
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
      </label>

      <p style={{ fontSize: 13, color: "#9e7b6e", marginBottom: 8 }}>
        地図に表示したい場合は、住所・ランドマーク名で検索するか、地図をタップして場所を指定（任意）
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
      {selectedPlace && <p style={{ fontSize: 12, color: "#43a047", marginBottom: 8 }}>✅ {selectedPlace}</p>}
      <div ref={mapRef} style={{ width: "100%", height: 240, borderRadius: 12, marginBottom: 8, border: "1px solid #f2c4a0" }} />
      {lat && <p style={{ fontSize: 12, color: "#43a047", marginBottom: 12 }}>✅ 場所を選択済み ({parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)})</p>}

      <label style={{ display: "block", marginBottom: 4, color: "#9e7b6e", fontSize: 13 }}>
        都道府県（任意。位置情報から自動入力。違う場合は選び直してください）
      </label>
      <select value={prefecture} onChange={(e) => setPrefecture(e.target.value)} style={inputStyle}>
        <option value="">未設定</option>
        {PREFECTURES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

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
