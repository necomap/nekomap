import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Users, Building2, MapPin, Calendar, MessageCircle } from "lucide-react"
import PageTitle from "../../components/PageTitle"
import { getOrCreateDmRoom } from "../../lib/chatRoom"
import RegionSelector from "../../components/RegionSelector"
import { useRegionFilter, filterByRegion } from "../../lib/useRegionFilter"
import FavoriteButton from "../../components/FavoriteButton"
import { loadFavoriteIds } from "../../lib/favorites"
import QrCodeButton from "../../components/QrCodeButton"

export default function Volunteer() {
  const router = useRouter()
  const [requests, setRequests] = useState([])
  const [user, setUser] = useState(null)
  const [applyingId, setApplyingId] = useState(null)
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const { region, changeRegion } = useRegionFilter()

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      if (data.user) {
        setFavoriteIds(await loadFavoriteIds(data.user.id, "volunteer_requests"))
      }
      loadRequests()
    }
    init()
  }, [])

  function handleFavoriteChange(id, next) {
    setFavoriteIds((prev) => {
      const updated = new Set(prev)
      if (next) updated.add(id); else updated.delete(id)
      return updated
    })
  }

  async function loadRequests() {
    // usersテーブル本体は本人・管理者のみ閲覧可のため、FK自動埋め込みは使えない。
    // 募集を取得後、投稿者の公開プロフィールをpublic_profilesビューから別途取得して合成する。
    const { data } = await supabase
      .from("volunteer_requests")
      .select("*")
      .order("created_at", { ascending: false })
    const reqs = data || []
    const creatorIds = [...new Set(reqs.map((r) => r.created_by).filter(Boolean))]
    let profileMap = {}
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("id, nickname, organization")
        .in("id", creatorIds)
      profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
    }
    setRequests(reqs.map((r) => ({ ...r, users: profileMap[r.created_by] || null })))
  }

  async function handleApply(req) {
    if (!user) { router.push("/login"); return }
    if (!req.created_by) { alert("募集者情報が見つかりませんでした"); return }
    if (user.id === req.created_by) return

    setApplyingId(req.id)
    try {
      const roomId = await getOrCreateDmRoom(user.id, req.created_by)
      router.push(`/chat/${roomId}`)
    } catch (e) {
      alert("メッセージ機能の準備に失敗しました: " + e.message)
      setApplyingId(null)
    }
  }

  const filtered = filterByRegion(requests, region)

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <PageTitle icon={<Users size={20} color="#e07a5f" />} title="ボランティア募集" />
        <div style={{ display: "flex", gap: 8 }}>
          <QrCodeButton label="QRコード" />
          <button onClick={() => router.push("/volunteer/new")} style={buttonStyle}>
            ＋ 募集する
          </button>
        </div>
      </div>

      <RegionSelector region={region ?? ""} onChange={changeRegion} />

      {filtered.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>募集中の案件はありません</p>
      )}

      {filtered.map((req) => (
        <div key={req.id} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <h3 style={{ margin: "0 0 8px" }}>{req.title}</h3>
            {user && (
              <FavoriteButton
                userId={user.id}
                targetTable="volunteer_requests"
                targetId={req.id}
                favorited={favoriteIds.has(req.id)}
                onChange={(next) => handleFavoriteChange(req.id, next)}
                size={16}
              />
            )}
          </div>
          {(req.users?.nickname || req.users?.organization) && (
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#9e7b6e", display: "flex", alignItems: "center", gap: 4 }}>
              <Users size={12} /> {req.users?.nickname || "匿名"}
              {req.users?.organization && (
                <span style={{ color: "#4a90e2", display: "inline-flex", alignItems: "center", gap: 2 }}> ・ <Building2 size={11} />{req.users.organization}</span>
              )}
            </p>
          )}
          {req.location && (
            <p style={{ margin: "0 0 4px", fontSize: 14, color: "#666", display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={13} /> {req.location}
            </p>
          )}
          {req.date && (
            <p style={{ margin: "0 0 4px", fontSize: 14, color: "#666", display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={13} /> {new Date(req.date).toLocaleString("ja-JP")}
            </p>
          )}
          {req.description && (
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "#444" }}>
              {req.description}
            </p>
          )}
          {req.lat && req.lng && (
            <a
              href={`https://www.google.com/maps?q=${req.lat},${req.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...mapLinkStyle, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <MapPin size={13} /> 地図で場所を確認する
            </a>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#bbb" }}>
              {new Date(req.created_at).toLocaleDateString("ja-JP")}
            </p>
            {req.created_by && user?.id !== req.created_by && (
              <button onClick={() => handleApply(req)} disabled={applyingId === req.id} style={{ ...applyButton, display: "flex", alignItems: "center", gap: 6 }}>
                {applyingId === req.id ? "準備中..." : <><MessageCircle size={14} /> 応募する・コンタクトを取る</>}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const buttonStyle = {
  padding: "10px 20px", background: "#e07a5f", color: "white",
  border: "none", borderRadius: 20, fontSize: 14, cursor: "pointer",
  fontFamily: "inherit",
}
const applyButton = {
  padding: "8px 16px", background: "#43a047", color: "white",
  border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer",
  fontFamily: "inherit",
}
const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16, padding: 16, marginBottom: 16,
  background: "white",
}
const mapLinkStyle = {
  display: "inline-block", marginBottom: 12, fontSize: 13,
  color: "#1565c0", textDecoration: "none",
}
