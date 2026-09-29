import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Home, Plus, Cat, MessageCircle } from "lucide-react"
import PageTitle from "../../components/PageTitle"
import { getOrCreateDmRoom } from "../../lib/chatRoom"
import RegionSelector from "../../components/RegionSelector"
import { useRegionFilter, filterByRegion } from "../../lib/useRegionFilter"
import FavoriteButton from "../../components/FavoriteButton"
import { loadFavoriteIds } from "../../lib/favorites"

export default function AdoptionList() {
  const router = useRouter()
  const [listings, setListings] = useState([])
  const [statusFilter, setStatusFilter] = useState("募集中")
  const [sexFilter, setSexFilter] = useState("all")
  const [neuteredOnly, setNeuteredOnly] = useState(false)
  const [feeFilter, setFeeFilter] = useState("all")
  const [user, setUser] = useState(null)
  const [contactingId, setContactingId] = useState(null)
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const { region, changeRegion } = useRegionFilter()

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      if (data.user) {
        setFavoriteIds(await loadFavoriteIds(data.user.id, "adoptions"))
      }
      loadListings()
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFavoriteChange(id, next) {
    setFavoriteIds((prev) => {
      const updated = new Set(prev)
      if (next) updated.add(id); else updated.delete(id)
      return updated
    })
  }

  async function loadListings() {
    const { data } = await supabase
      .from("adoptions")
      .select("*")
      .order("created_at", { ascending: false })
    setListings(data || [])
  }

  async function handleContact(listing) {
    if (!user) {
      alert("コンタクトを取るにはログインが必要です。ログイン画面へ移動します。")
      router.push("/login")
      return
    }
    if (user.id === listing.created_by) return

    setContactingId(listing.id)
    try {
      const roomId = await getOrCreateDmRoom(user.id, listing.created_by)
      router.push(`/chat/${roomId}`)
    } catch (e) {
      alert("メッセージ機能の準備に失敗しました: " + e.message)
      setContactingId(null)
    }
  }

  const filtered = filterByRegion(listings, region)
    .filter((l) => statusFilter === "all" || l.status === statusFilter)
    .filter((l) => sexFilter === "all" || l.sex === sexFilter)
    .filter((l) => !neuteredOnly || l.neutered)
    .filter((l) => feeFilter === "all" || (feeFilter === "free" ? !l.fee_amount : l.fee_amount > 0))

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Home size={20} color="#e07a5f" />} title="里親募集" />
      <p style={{ color: "#9e7b6e", marginBottom: 16, fontSize: 14 }}>
        新しい飼い主を探している猫の一覧です。閲覧・コンタクトはログインなしでも見られますが、
        コンタクトを取るにはログインが必要です。
      </p>

      <RegionSelector region={region ?? ""} onChange={changeRegion} />

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { value: "募集中", label: "募集中" },
          { value: "成立", label: "成立済み" },
          { value: "all", label: "すべて" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            style={{
              ...filterBtn,
              background: statusFilter === opt.value ? "#e07a5f" : "#f0e6e0",
              color: statusFilter === opt.value ? "white" : "#9e7b6e",
            }}
          >
            {opt.label}
          </button>
        ))}
        <button onClick={() => router.push("/adoption/new")} style={{ ...filterBtn, marginLeft: "auto", background: "#4a90e2", color: "white", display: "flex", alignItems: "center", gap: 4 }}>
          <Plus size={14} /> 投稿する
        </button>
      </div>

      <div style={detailFilterRow}>
        <select value={sexFilter} onChange={(e) => setSexFilter(e.target.value)} style={detailFilterSelect}>
          <option value="all">性別: すべて</option>
          <option value="オス">オス</option>
          <option value="メス">メス</option>
          <option value="不明">不明</option>
        </select>
        <select value={feeFilter} onChange={(e) => setFeeFilter(e.target.value)} style={detailFilterSelect}>
          <option value="all">負担金額: すべて</option>
          <option value="free">無料のみ</option>
          <option value="paid">有料のみ</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#9e7b6e", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={neuteredOnly} onChange={(e) => setNeuteredOnly(e.target.checked)} />
          避妊・去勢済みのみ
        </label>
      </div>

      {filtered.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>該当する里親募集はまだありません</p>
      )}

      {filtered.map((l) => (
        <div key={l.id} style={cardStyle} onClick={() => router.push(`/adoption/${l.id}`)}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 12, flexShrink: 0,
              background: "#f0e6e0", display: "flex", alignItems: "center",
              justifyContent: "center", overflow: "hidden", fontSize: 28,
            }}>
              {l.photo ? <img src={l.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Cat size={26} color="#c4a090" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, flex: 1 }}>{l.name}</h3>
                {l.status === "成立" && (
                  <span style={statusBadge}>成立済み</span>
                )}
                {user && (
                  <FavoriteButton
                    userId={user.id}
                    targetTable="adoptions"
                    targetId={l.id}
                    favorited={favoriteIds.has(l.id)}
                    onChange={(next) => handleFavoriteChange(l.id, next)}
                    size={16}
                  />
                )}
              </div>
              <p style={{ margin: "4px 0", fontSize: 13, color: "#666" }}>
                {[l.sex, l.neutered ? "避妊・去勢済み" : null, l.age_note].filter(Boolean).join(" ・ ")}
              </p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#e07a5f" }}>
                {l.fee_amount > 0 ? `負担金額: ${l.fee_amount.toLocaleString()}円` : "負担金額: 無料"}
              </p>
            </div>
          </div>
          {l.description && (
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "#444", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {l.description}
            </p>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleContact(l) }}
            disabled={contactingId === l.id || user?.id === l.created_by}
            style={{ ...contactBtn, opacity: user?.id === l.created_by ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            {user?.id === l.created_by ? "自分の投稿です" : contactingId === l.id ? "準備中..." : <><MessageCircle size={14} /> コンタクトを取る</>}
          </button>
        </div>
      ))}
    </div>
  )
}

const filterBtn = {
  padding: "6px 14px", borderRadius: 20, fontSize: 13,
  border: "none", cursor: "pointer", fontFamily: "inherit",
}
const detailFilterRow = {
  display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center",
}
const detailFilterSelect = {
  padding: "6px 10px", border: "1px solid #f2c4a0", borderRadius: 10,
  fontSize: 13, fontFamily: "inherit", background: "white", color: "#3d3230",
}
const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16,
  padding: 16, marginBottom: 16, background: "white", cursor: "pointer",
}
const statusBadge = {
  fontSize: 11, padding: "2px 8px", borderRadius: 10,
  background: "#eee", color: "#888",
}
const contactBtn = {
  display: "block", width: "100%", marginTop: 12, padding: "10px",
  background: "#e07a5f", color: "white", border: "none",
  borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
}
