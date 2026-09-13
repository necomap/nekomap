import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { MessageCircle } from "lucide-react"
import PageTitle from "../../components/PageTitle"

export default function ChatList() {
  const router = useRouter()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push("/login"); return }
      const uid = userData.user.id

      const { data: roomRows } = await supabase
        .from("chat_rooms")
        .select("*")
        .or(`user_a.eq.${uid},user_b.eq.${uid}`)

      if (!roomRows || roomRows.length === 0) {
        setRooms([])
        setLoading(false)
        return
      }

      // 各部屋の相手プロフィールと最新メッセージをまとめて取得する
      const enriched = await Promise.all(
        roomRows.map(async (r) => {
          const otherId = r.user_a === uid ? r.user_b : r.user_a
          const myLastRead = r.user_a === uid ? r.last_read_at_a : r.last_read_at_b

          const [{ data: otherUser }, { data: lastMsgs }] = await Promise.all([
            supabase.from("users").select("nickname, avatar, organization").eq("id", otherId).single(),
            supabase
              .from("chats")
              .select("message, photo, sender, created_at")
              .eq("room_id", r.id)
              .order("created_at", { ascending: false })
              .limit(1),
          ])
          const lastMsg = lastMsgs?.[0] || null

          let unread = false
          if (lastMsg && lastMsg.sender !== uid) {
            unread = !myLastRead || new Date(lastMsg.created_at) > new Date(myLastRead)
          }

          return { id: r.id, otherUser, lastMsg, unread, sortAt: lastMsg?.created_at || r.created_at }
        })
      )

      enriched.sort((a, b) => new Date(b.sortAt) - new Date(a.sortAt))
      setRooms(enriched)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<MessageCircle size={20} color="#e07a5f" />} title="メッセージ" />

      {loading && <p style={{ textAlign: "center", color: "#999" }}>読み込み中...</p>}

      {!loading && rooms.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>
          まだやり取りはありません。掲示板やボランティア募集から「コンタクトを取る」を押すと、ここに表示されます。
        </p>
      )}

      {rooms.map((r) => (
        <div key={r.id} onClick={() => router.push(`/chat/${r.id}`)} style={cardStyle}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "#f0e6e0", overflow: "hidden", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>
            {r.otherUser?.avatar
              ? <img src={r.otherUser.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : "🐱"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: r.unread ? 700 : 500, fontSize: 15 }}>
                {r.otherUser?.nickname || "匿名"}
              </span>
              {r.otherUser?.organization && (
                <span style={{ fontSize: 11, color: "#4a90e2" }}>🏢{r.otherUser.organization}</span>
              )}
            </div>
            <p style={{
              margin: "2px 0 0", fontSize: 13, color: r.unread ? "#3d3230" : "#9e7b6e",
              fontWeight: r.unread ? 600 : 400,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {r.lastMsg ? (r.lastMsg.message || (r.lastMsg.photo ? "📷 画像" : "")) : "まだメッセージはありません"}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
            {r.lastMsg && (
              <span style={{ fontSize: 11, color: "#bbb" }}>
                {new Date(r.lastMsg.created_at).toLocaleDateString("ja-JP")}
              </span>
            )}
            {r.unread && <span style={unreadDot} />}
          </div>
        </div>
      ))}
    </div>
  )
}

const cardStyle = {
  display: "flex", alignItems: "center", gap: 12,
  border: "1px solid #f2c4a0", borderRadius: 16, padding: "12px 16px",
  marginBottom: 10, background: "white", cursor: "pointer",
}
const unreadDot = {
  width: 10, height: 10, borderRadius: "50%", background: "#e07a5f",
}
