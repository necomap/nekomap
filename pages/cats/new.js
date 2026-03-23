import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Cat, Upload } from "lucide-react"

export default function NewCat() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [features, setFeatures] = useState("")
  const [sex, setSex] = useState("")
  const [neutered, setNeutered] = useState(false)
  const [notes, setNotes] = useState("")
  const [photo, setPhoto] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!name) {
      setError("猫の名前を入力してください")
      return
    }

    setLoading(true)
    let photoUrl = null

    // 写真アップロード
    if (photo) {
      const fileName = `${Date.now()}_${photo.name}`
      const { error: uploadError } = await supabase.storage
        .from("cat-photos")
        .upload(fileName, photo)

      if (uploadError) {
        setError("写真のアップロードに失敗しました")
        setLoading(false)
        return
      }

      const { data } = supabase.storage
        .from("cat-photos")
        .getPublicUrl(fileName)
      photoUrl = data.publicUrl
    }

    // 猫情報を保存
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from("cats").insert({
      name,
      features,
      sex,
      neutered,
      notes,
      photo: photoUrl,
      created_by: userData.user?.id,
    })

    if (error) {
      setError("保存に失敗しました: " + error.message)
      setLoading(false)
      return
    }

    router.push("/cats")
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
    <h1 style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
      <Cat size={24} color="#e07a5f" /> 猫を登録する
    </h1>

      <input
        placeholder="猫の名前（必須）"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />
      <textarea
        placeholder="特徴（毛色、模様など）"
        value={features}
        onChange={(e) => setFeatures(e.target.value)}
        style={{ ...inputStyle, height: 80 }}
      />
      <select
        value={sex}
        onChange={(e) => setSex(e.target.value)}
        style={inputStyle}
      >
        <option value="">性別を選択</option>
        <option value="オス">オス</option>
        <option value="メス">メス</option>
        <option value="不明">不明</option>
      </select>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={neutered}
          onChange={(e) => setNeutered(e.target.checked)}
        />
        避妊・去勢手術済み
      </label>

      <textarea
        placeholder="注意事項（人慣れしていないなど）"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={{ ...inputStyle, height: 80 }}
      />

      <label style={{ display: "block", marginBottom: 12 }}>
        <span style={{ display: "block", marginBottom: 4, color: "#666" }}>写真</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files[0])}
        />
      </label>

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={buttonStyle}
      >
        {loading ? "登録中..." : "登録する"}
      </button>

      <button
        onClick={() => router.back()}
        style={{ ...buttonStyle, background: "#999", marginTop: 8 }}
      >
        戻る
      </button>
    </div>
  )
}

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  marginBottom: 12,
  border: "1px solid #ddd",
  borderRadius: 8,
  fontSize: 16,
  boxSizing: "border-box",
}

const buttonStyle = {
  display: "block",
  width: "100%",
  padding: "12px",
  background: "#4a90e2",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 16,
  cursor: "pointer",
}