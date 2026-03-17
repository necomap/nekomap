import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

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

  useState(() => {
    async function loadCats() {
      const { data } = await supabase.from("cats").select("id, name")
      setCats(data || [])
    }
    loadCats()

    // GPS自動取得
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
      })
    }
  }, [])

  async function handleSubmit() {
    setLoading(true)
    let photoUrl = null

    if (photo) {
      const fileName = `${Date.now()}_${photo.name}`
      const { error: uploadError } = await supabase.storage
        .from("cat-photos")
        .upload(fileName, photo)
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
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      created_by: userData.user?.id,
    })

    if (error) {
      setError("投稿に失敗しました: " + error.message)
      setLoading(false)
      return
    }

    router.push("/map")
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>📍 目撃情報を投稿</h1>

      <select
        value={catId}
        onChange={(e) => setCatId(e.target.value)}
        style={inputStyle}
      >
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
        <span style={{ display: "block", marginBottom: 4, color: "#666" }}>写真</span>
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
      </label>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          placeholder="緯度"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          style={{ ...inputStyle, marginBottom: 0 }}
        />
        <input
          placeholder="経度"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          style={{ ...inputStyle, marginBottom: 0 }}
        />
      </div>
      <p style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>
        ※ 位置情報は自動取得されます。手動で修正も可能です。
      </p>

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <button onClick={handleSubmit} disabled={loading} style={buttonStyle}>
        {loading ? "投稿中..." : "投稿する"}
      </button>
      <button onClick={() => router.back()} style={{ ...buttonStyle, background: "#999", marginTop: 8 }}>
        戻る
      </button>
    </div>
  )
}

const inputStyle = {
  display: "block", width: "100%", padding: "10px 12px",
  marginBottom: 12, border: "1px solid #ddd", borderRadius: 8,
  fontSize: 16, boxSizing: "border-box",
}
const buttonStyle = {
  display: "block", width: "100%", padding: "12px",
  background: "#4a90e2", color: "white", border: "none",
  borderRadius: 8, fontSize: 16, cursor: "pointer",
}