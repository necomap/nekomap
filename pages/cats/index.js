import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Cat, Search, Feather, SearchX } from "lucide-react"
import PageTitle from "../../components/PageTitle"

export default function CatList() {
  const router = useRouter()
  const [cats, setCats] = useState([])
  const [search, setSearch] = useState("")
  const [missingFilter, setMissingFilter] = useState("all")

  useEffect(() => {
    async function loadCats() {
      const { data, error } = await supabase
        .from("cats")
        .select("*")
        .or("memorial.is.null,memorial.eq.false")
        .order("created_at", { ascending: false })
      if (error) console.log("エラー:", error.message)
      setCats(data || [])
    }
    loadCats()
  }, [])

  const filtered = cats
    .filter((c) =>
      search === "" ||
      c.name?.includes(search) ||
      c.features?.includes(search)
    )
    .filter((c) => missingFilter === "all" || (missingFilter === "missing" ? c.missing : !c.missing))

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <PageTitle icon={<Cat size={20} color="#e07a5f" />} title="地域猫一覧" />
        <button onClick={() => router.push("/cats/new")} style={buttonStyle}>
          ＋ 猫を登録
        </button>
      </div>

      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search size={16} color="#c4a090" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input
          placeholder="名前・特徴で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, marginBottom: 0, paddingLeft: 36 }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { value: "all", label: "すべて" },
          { value: "missing", label: "行方不明のみ" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMissingFilter(opt.value)}
            style={{
              ...filterBtn,
              background: missingFilter === opt.value ? "#e07a5f" : "#f0e6e0",
              color: missingFilter === opt.value ? "white" : "#9e7b6e",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>
          {missingFilter === "missing" ? "行方不明の猫はいません" : "まだ登録された猫がいません"}
        </p>
      )}

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <a href="/memorial" style={{ ...memorialLinkStyle, display: "inline-flex", alignItems: "center", gap: 4 }}><Feather size={13} /> 訃報ページを見る</a>
      </div>

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
              <div style={{ width: "100%", height: 160, background: "#f0e6e0", borderRadius: 10, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Cat size={40} color="#c4a090" />
              </div>
            )}
            <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>{cat.name}</h3>
            {cat.features && (
              <p style={{ margin: "0 0 6px", color: "#666", fontSize: 13 }}>
                {cat.features.slice(0, 30)}{cat.features.length > 30 ? "..." : ""}
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {cat.neutered && (
                <span style={{ fontSize: 11, background: "#e8f5e9", color: "#2d7a2d", padding: "2px 8px", borderRadius: 12 }}>
                  手術済み
                </span>
              )}
              {cat.missing && (
                <span style={{ fontSize: 11, background: "#fff3e0", color: "#e65100", padding: "2px 8px", borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <SearchX size={11} /> 行方不明
                </span>
              )}
            </div>
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
const filterBtn = {
  padding: "6px 14px", borderRadius: 20, fontSize: 13,
  border: "none", cursor: "pointer", fontFamily: "inherit",
}
const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 14, padding: 12,
  cursor: "pointer", background: "white",
}
const memorialLinkStyle = {
  fontSize: 13, color: "#9e7b6e", textDecoration: "none",
}