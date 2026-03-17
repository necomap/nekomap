import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

export default function CatDetail() {
  const router = useRouter()
  const { id } = router.query
  const [cat, setCat] = useState(null)

  useEffect(() => {
    if (!id) return
    async function loadCat() {
      const { data } = await supabase
        .from("cats")
        .select("*")
        .eq("id", id)
        .single()
      setCat(data)
    }
    loadCat()
  }, [id])

  if (!cat) return <p style={{ textAlign: "center", marginTop: 80 }}>読み込み中...</p>

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <button
        onClick={() => router.back()}
        style={{ marginBottom: 24, background: "none", border: "none", cursor: "pointer", color: "#4a90e2", fontSize: 16 }}
      >
        ← 戻る
      </button>

      {cat.photo ? (
        <img
          src={cat.photo}
          alt={cat.name}
          style={{ width: "100%", height: 240, objectFit: "cover", borderRadius: 12, marginBottom: 16 }}
        />
      ) : (
        <div style={{ width: "100%", height: 240, background: "#f0f0f0", borderRadius: 12, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>
          🐱
        </div>
      )}

      <h1 style={{ marginBottom: 8 }}>{cat.name}</h1>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <tbody>
          {cat.sex && (
            <tr style={rowStyle}>
              <td style={labelStyle}>性別</td>
              <td>{cat.sex}</td>
            </tr>
          )}
          <tr style={rowStyle}>
            <td style={labelStyle}>避妊・去勢</td>
            <td>{cat.neutered ? "済み" : "未"}</td>
          </tr>
          {cat.features && (
            <tr style={rowStyle}>
              <td style={labelStyle}>特徴</td>
              <td>{cat.features}</td>
            </tr>
          )}
          {cat.notes && (
            <tr style={rowStyle}>
              <td style={labelStyle}>注意事項</td>
              <td>{cat.notes}</td>
            </tr>
          )}
        </tbody>
      </table>

      <button
        onClick={() => router.push(`/cats/${id}/edit`)}
        style={buttonStyle}
      >
        編集する
      </button>
    </div>
  )
}

const rowStyle = {
  borderBottom: "1px solid #eee",
}

const labelStyle = {
  padding: "10px 0",
  color: "#666",
  width: 100,
  fontSize: 14,
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