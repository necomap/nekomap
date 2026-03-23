import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"

export default function CatList() {
  const router = useRouter()
  const [cats, setCats] = useState([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function loadCats() {
      const { data, error } = await supabase
        .from("cats")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) console.log("エラー:", error.message)
      setCats(data || [])
    }
    loadCats()
  }, [])

  const filtered = cats.filter((c) =>
    search === "" ||
    c.name?.includes(search) ||
    c.features?.includes(search)
  )

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>🐱 地域猫一覧</h1>
        <button onClick={() => router.push("/cats/new")} style={buttonStyle}>
          ＋ 猫を登録
        </button>
      </div>

      <input
        placeholder="🔎 名前・特徴で検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...inputStyle, marginBottom: 20 }}
      />

      {filtered.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>まだ登録された猫がいません</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {filtered.map((cat) => (
          <div
            key={cat.id}
            onClick={() => router.push(`/cats/${cat.id}`)}
            style={cardStyle}
          >
            {cat.photo ? (
              <img
                src={cat.photo}
                alt={cat.name}
                style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 10, marginBottom: 8 }}
              />
            ) : (
              <div style={{ width: "100%", height: 160, background: "#f0e6e0", borderRadius: 10, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
                🐱
              </div>
            )}
            <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>{cat.name}</h3>
            {cat.features && (
              <p style={{ margin: "0 0 6px", color: "#666", fontSize: 13 }}>
                {cat.features.slice(0, 30)}{cat.features.length > 30 ? "..." : ""}
              </p>
            )}
            {cat.neutered && (
              <span style={{ fontSize: 11, background: "#e8f5e9", color: "#2d7a2d", padding: "2px 8px", borderRadius: 12 }}>
                手術済み
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const inputStyle = {
  display: "block", width: "100%", padding: "10px 12px",
  border: "1px solid #f2c4a0", borderRadius: 12,
  fontSize: 16, boxSizing: "border-box",
  background: "white", fontFamily: "inherit",
}
const buttonStyle = {
  padding: "10px 20px", background: "#e07a5f", color: "white",
  border: "none", borderRadius: 20, fontSize: 14, cursor: "pointer",
  fontFamily: "inherit",
}
const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 14, padding: 12,
  cursor: "pointer", background: "white",
}