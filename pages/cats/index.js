import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

export default function CatList() {
  const router = useRouter()
  const [cats, setCats] = useState([])

  useEffect(() => {
    async function loadCats() {
      const { data } = await supabase
        .from("cats")
        .select("*")
        .order("created_at", { ascending: false })
      setCats(data || [])
    }
    loadCats()
  }, [])

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>🐱 地域猫一覧</h1>
        <button
          onClick={() => router.push("/cats/new")}
          style={buttonStyle}
        >
          ＋ 猫を登録
        </button>
      </div>

      {cats.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>まだ登録された猫がいません</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {cats.map((cat) => (
          <div
            key={cat.id}
            onClick={() => router.push(`/cats/${cat.id}`)}
            style={cardStyle}
          >
            {cat.photo ? (
              <img
                src={cat.photo}
                alt={cat.name}
                style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8, marginBottom: 8 }}
              />
            ) : (
              <div style={{ width: "100%", height: 160, background: "#f0f0f0", borderRadius: 8, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
                🐱
              </div>
            )}
            <h3 style={{ margin: "0 0 4px" }}>{cat.name}</h3>
            <p style={{ margin: 0, color: "#666", fontSize: 14 }}>{cat.features}</p>
            {cat.neutered && (
              <span style={{ fontSize: 12, background: "#e8f4e8", color: "#2d7a2d", padding: "2px 8px", borderRadius: 12, marginTop: 4, display: "inline-block" }}>
                手術済み
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const buttonStyle = {
  padding: "10px 20px",
  background: "#4a90e2",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer",
}

const cardStyle = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 12,
  cursor: "pointer",
  transition: "box-shadow 0.2s",
}