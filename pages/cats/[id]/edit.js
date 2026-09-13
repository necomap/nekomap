import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/router"
import { Cat } from "lucide-react"
import PageTitle from "../../../components/PageTitle"
import { getImageEmbedding, embeddingToVectorLiteral } from "../../../lib/catFaceAI"
import { compressImage } from "../../../lib/compressImage"

export default function EditCat() {
  const router = useRouter()
  const { id } = router.query
  const [checked, setChecked] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [name, setName] = useState("")
  const [features, setFeatures] = useState("")
  const [sex, setSex] = useState("")
  const [neutered, setNeutered] = useState(false)
  const [notes, setNotes] = useState("")
  const [photo, setPhoto] = useState(null)
  const [existingPhoto, setExistingPhoto] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState("idle") // idle | analyzing | done | failed

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push("/login"); return }

      const { data: cat, error: catError } = await supabase
        .from("cats").select("*").eq("id", id).single()
      if (catError || !cat) { setChecked(true); return }

      const { data: profile } = await supabase
        .from("users").select("role").eq("id", userData.user.id).single()

      const isOwnerOrAdmin = userData.user.id === cat.created_by || profile?.role === "admin"
      if (!isOwnerOrAdmin) {
        // 権限がない場合は詳細ページに戻す
        router.replace(`/cats/${id}`)
        return
      }

      setName(cat.name || "")
      setFeatures(cat.features || "")
      setSex(cat.sex || "")
      setNeutered(!!cat.neutered)
      setNotes(cat.notes || "")
      setExistingPhoto(cat.photo || null)
      setAllowed(true)
      setChecked(true)
    }
    load()
  }, [id])

  async function handleSubmit() {
    if (!name) {
      setError("猫の名前を入力してください")
      return
    }

    setLoading(true)
    setError("")

    const update = { name, features, sex, neutered, notes }

    if (photo) {
      const compressedPhoto = await compressImage(photo)
      const fileName = `${Date.now()}_${compressedPhoto.name}`
      const { error: uploadError } = await supabase.storage
        .from("cat-photos")
        .upload(fileName, compressedPhoto)

      if (uploadError) {
        setError("写真のアップロードに失敗しました")
        setLoading(false)
        return
      }

      const { data } = supabase.storage.from("cat-photos").getPublicUrl(fileName)
      update.photo = data.publicUrl

      // 写真を差し替えた場合のみ、AIの特徴データも再計算する
      try {
        setAiStatus("analyzing")
        const embedding = await getImageEmbedding(compressedPhoto)
        update.face_embedding = embeddingToVectorLiteral(embedding)
        update.face_embedding_updated_at = new Date().toISOString()
        setAiStatus("done")
      } catch (e) {
        console.log("AI解析に失敗（更新は続行します）:", e.message)
        setAiStatus("failed")
      }
    }

    const { error: updateError } = await supabase.from("cats").update(update).eq("id", id)

    if (updateError) {
      setError("保存に失敗しました: " + updateError.message)
      setLoading(false)
      return
    }

    router.push(`/cats/${id}`)
  }

  if (!checked) {
    return (
      <div style={{ textAlign: "center", marginTop: 80 }}>
        <p style={{ color: "#9e7b6e" }}>確認中...</p>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div style={{ textAlign: "center", marginTop: 80 }}>
        <p style={{ color: "#9e7b6e" }}>この猫の情報は見つかりませんでした</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Cat size={20} color="#e07a5f" />} title="猫の情報を編集" />

      <input
        placeholder="猫の名前（必須）"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />
      <textarea
        placeholder="特徴（毛色・模様など）"
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
        <span style={{ display: "block", marginBottom: 4, color: "#9e7b6e", fontSize: 13 }}>写真</span>
        {existingPhoto && !photo && (
          <img src={existingPhoto} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 12, marginBottom: 8, display: "block" }} />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files[0])}
        />
        <span style={{ display: "block", marginTop: 4, color: "#bbb", fontSize: 12 }}>
          写真を選び直すと、AI識別用の特徴データも再計算されます（そのままでもOKです）
        </span>
      </label>

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={buttonStyle}
      >
        {loading
          ? (aiStatus === "analyzing" ? "AI解析中..." : "保存中...")
          : "保存する"}
      </button>

      <button
        onClick={() => router.back()}
        style={{ ...buttonStyle, background: "#f0e6e0", color: "#e07a5f", marginTop: 8 }}
      >
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
