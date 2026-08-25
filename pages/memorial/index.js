import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

export default function Memorial() {
  const router = useRouter()
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("cats")
        .select("*")
        .eq("memorial", true)
        .order("memorial_date", { ascending: false })
      if (error) console.log("エラー:", error.message)
      setCats(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <button onClick={() => router.push("/cats")} style={backBtn}>← 地域猫一覧に戻る</button>

      <h1 style={{ margin: "0 0 8px", color: "#3d3230" }}>🕊️ 訃報</h1>
      <p style={{ color: "#9e7b6e", fontSize: 14, marginBottom: 24 }}>
        虹の橋を渡った地域猫たちを偲んで。
      </p>

      {loading && <p style={{ textAlign: "center", color: "#999" }}>読み込み中...</p>}
      {!loading && cats.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>まだ記録はありません</p>
      )}

      {cats.map((cat) => (
        <div
          key={cat.id}
          onClick={() => router.push(`/cats/${cat.id}`)}
          style={cardStyle}
        >
          <div style={{ display: "flex", gap: 12 }}>
            {cat.photo ? (
              <img
                src={cat.photo}
                style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, filter: "grayscale(30%)" }}
              />
            ) : (
              <div style={{
                width: 72, height: 72, background: "#f0e6e0", borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
              }}>
                🐱
              </div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 16 }}>🕊️ {cat.name}</p>
              {cat.memorial_date && (
                <p style={{ margin: "0 0 4px", fontSize: 12, color: "#9e7b6e" }}>{cat.memorial_date}</p>
              )}
              {cat.memorial_note && (
                <p style={{ margin: 0, fontSize: 13, color: "#666", lineHeight: 1.5 }}>
                  {cat.memorial_note.slice(0, 60)}{cat.memorial_note.length > 60 ? "..." : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const backBtn = {
  background: "none", border: "none", cursor: "pointer",
  color: "#e07a5f", fontSize: 16, marginBottom: 16, fontFamily: "inherit",
}
const cardStyle = {
  border: "1px solid #e5e0dc", borderRadius: 14, padding: 14,
  marginBottom: 12, background: "#fafafa", cursor: "pointer",
}
