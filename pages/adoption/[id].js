import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Home } from "lucide-react"
import PageTitle from "../../components/PageTitle"
import { getOrCreateDmRoom } from "../../lib/chatRoom"
import QrCodeButton from "../../components/QrCodeButton"

export default function AdoptionDetail() {
  const router = useRouter()
  const { id } = router.query
  const [listing, setListing] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [contacting, setContacting] = useState(false)

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData.user)

      const { data, error } = await supabase
        .from("adoptions")
        .select("*")
        .eq("id", id)
        .single()
      if (error) console.log("里親募集取得エラー:", error.message)
      setListing(data)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleContact() {
    if (!user) {
      alert("コンタクトを取るにはログインが必要です。ログイン画面へ移動します。")
      router.push("/login")
      return
    }
    if (user.id === listing.created_by) return

    setContacting(true)
    try {
      const roomId = await getOrCreateDmRoom(user.id, listing.created_by)
      router.push(`/chat/${roomId}`)
    } catch (e) {
      alert("メッセージ機能の準備に失敗しました: " + e.message)
      setContacting(false)
    }
  }

  async function toggleStatus() {
    const newStatus = listing.status === "成立" ? "募集中" : "成立"
    const { error } = await supabase.from("adoptions").update({ status: newStatus }).eq("id", id)
    if (!error) setListing({ ...listing, status: newStatus })
  }

  async function handleDelete() {
    if (!confirm("この里親募集を削除しますか？")) return
    await supabase.from("adoptions").delete().eq("id", id)
    router.push("/adoption")
  }

  if (loading) return null
  if (!listing) return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24, textAlign: "center" }}>
      <p>この里親募集は見つかりませんでした</p>
    </div>
  )

  const isOwner = user?.id === listing.created_by

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Home size={20} color="#e07a5f" />} title={listing.name} />

      <div style={{ marginBottom: 12, textAlign: "right" }}>
        <QrCodeButton label="📮 ポスター用QRコード" />
      </div>

      {listing.status === "成立" && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "#eee", borderRadius: 8, fontSize: 13, color: "#888" }}>
          この里親募集は成立済みです
        </div>
      )}

      {listing.photo && (
        <img src={listing.photo} style={{ width: "100%", borderRadius: 12, marginBottom: 16, maxHeight: 320, objectFit: "cover" }} />
      )}

      <p style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
        {[listing.sex, listing.neutered ? "避妊・去勢済み" : null, listing.age_note].filter(Boolean).join(" ・ ")}
      </p>

      <div style={{ padding: 12, background: "#fff9f5", borderRadius: 10, border: "1px solid #f2c4a0", marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#e07a5f" }}>
          {listing.fee_amount > 0 ? `負担金額: ${listing.fee_amount.toLocaleString()}円` : "負担金額: 無料"}
        </p>
        {listing.fee_note && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#444", whiteSpace: "pre-wrap" }}>{listing.fee_note}</p>}
      </div>

      {listing.features && (
        <Section title="特徴">{listing.features}</Section>
      )}
      {listing.health_note && (
        <Section title="健康状態">{listing.health_note}</Section>
      )}
      {listing.description && (
        <Section title="里親募集の詳細">{listing.description}</Section>
      )}
      {listing.cat_id && (
        <a href={`/cats/${listing.cat_id}`} style={{ display: "block", marginBottom: 16, color: "#e07a5f", fontSize: 13 }}>
          🐱 登録済みの猫の詳細を見る →
        </a>
      )}

      {!isOwner && (
        <button onClick={handleContact} disabled={contacting} style={buttonStyle}>
          {contacting ? "準備中..." : "💬 コンタクトを取る"}
        </button>
      )}

      {isOwner && (
        <>
          <button onClick={toggleStatus} style={{ ...buttonStyle, background: "#4a90e2" }}>
            {listing.status === "成立" ? "募集中に戻す" : "成立済みにする"}
          </button>
          <button onClick={handleDelete} style={{ ...buttonStyle, background: "#f0e6e0", color: "#e07a5f", marginTop: 8 }}>
            削除する
          </button>
        </>
      )}

      <button onClick={() => router.push("/adoption")} style={{ ...buttonStyle, background: "#f0e6e0", color: "#e07a5f", marginTop: 8 }}>
        一覧に戻る
      </button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: "0 0 4px", fontSize: 12, color: "#9e7b6e", fontWeight: 600 }}>{title}</p>
      <p style={{ margin: 0, fontSize: 14, color: "#3d3230", whiteSpace: "pre-wrap" }}>{children}</p>
    </div>
  )
}

const buttonStyle = {
  display: "block", width: "100%", padding: "12px",
  background: "#e07a5f", color: "white", border: "none",
  borderRadius: 12, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
}
