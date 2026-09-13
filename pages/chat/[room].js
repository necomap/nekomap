import { useEffect, useState, useRef } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Send, Camera } from "lucide-react"
import { compressImage } from "../../lib/compressImage"

export default function ChatRoom() {
  const router = useRouter()
  const { room } = router.query
  const [messages, setMessages] = useState([])
  const [text, setText] = useState("")
  const [user, setUser] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [accessChecked, setAccessChecked] = useState(false)
  const [hasAccess, setHasAccess] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { router.push("/login"); return }
      setUser(data.user)
    }
    init()
  }, [])

  // 部屋の当事者を確認し、相手のニックネームを取得する
  useEffect(() => {
    if (!room || !user) return

    async function loadRoom() {
      const { data: roomData } = await supabase
        .from("chat_rooms")
        .select("user_a, user_b")
        .eq("id", room)
        .maybeSingle()

      if (!roomData) { setHasAccess(false); setAccessChecked(true); return }

      const otherId = roomData.user_a === user.id ? roomData.user_b : roomData.user_a
      const { data: otherProfile } = await supabase
        .from("users").select("nickname, avatar, organization").eq("id", otherId).single()
      setOtherUser(otherProfile)
      setAccessChecked(true)

      // この部屋を開いたことを記録（チャット一覧の未読表示に使う）
      const myField = roomData.user_a === user.id ? "last_read_at_a" : "last_read_at_b"
      await supabase.from("chat_rooms").update({ [myField]: new Date().toISOString() }).eq("id", room)
    }
    loadRoom()
  }, [room, user])

  useEffect(() => {
    if (!room || !hasAccess) return

    async function loadMessages() {
      const { data } = await supabase
        .from("chats")
        .select("*")
        .eq("room_id", room)
        .order("created_at", { ascending: true })
      setMessages(data || [])
    }
    loadMessages()

    const channel = supabase
      .channel("chat_" + room)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chats" },
        (payload) => {
          setMessages((m) => [...m, payload.new])
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [room, hasAccess])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    if (!text.trim() && !photo) return

    let photoUrl = null
    if (photo) {
      const compressedPhoto = await compressImage(photo)
      const fileName = `${Date.now()}_${compressedPhoto.name}`
      const { error: uploadError } = await supabase.storage
        .from("cat-photos")
        .upload(fileName, compressedPhoto)
      if (!uploadError) {
        const { data } = supabase.storage.from("cat-photos").getPublicUrl(fileName)
        photoUrl = data.publicUrl
      }
      setPhoto(null)
    }

    const sentText = text
    await supabase.from("chats").insert({
      room_id: room,
      sender: user?.id,
      message: text,
      photo: photoUrl,
    })
    setText("")

    // 相手にプッシュ通知（未設定の場合はAPI側で静かにスキップされるので、
    // 失敗してもチャット自体には影響させない）
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (accessToken) {
        fetch("/api/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ type: "chat", roomId: room, preview: sentText || "📷 画像を送信しました" }),
        }).catch(() => {})
      }
    } catch (e) {
      // 通知送信の失敗はチャット機能に影響させない
    }
  }

  if (!accessChecked) {
    return (
      <div style={{ textAlign: "center", marginTop: 80 }}>
        <p style={{ color: "#9e7b6e" }}>読み込み中...</p>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div style={{ textAlign: "center", marginTop: 80, padding: 24 }}>
        <p style={{ color: "#9e7b6e", marginBottom: 16 }}>このチャットにはアクセスできません</p>
        <button onClick={() => router.push("/board")} style={{ background: "none", border: "none", cursor: "pointer", color: "#e07a5f", fontSize: 16, fontFamily: "inherit" }}>
          ← 掲示板に戻る
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{
        padding: "16px 24px", borderBottom: "1px solid #f2c4a0",
        display: "flex", alignItems: "center", gap: 12,
        background: "rgba(255,249,245,0.95)",
      }}>
        <button
          onClick={() => router.push("/chat")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#e07a5f", fontSize: 16, fontFamily: "inherit" }}
        >
          ←
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: "#3d3230" }}>
            💬 {otherUser?.nickname || "チャット"}
          </h2>
          {otherUser?.organization && (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#4a90e2" }}>🏢 {otherUser.organization}</p>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#fff9f5" }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.sender === user?.id ? "flex-end" : "flex-start",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                maxWidth: "70%",
                padding: "10px 14px",
                borderRadius: msg.sender === user?.id ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.sender === user?.id ? "#e07a5f" : "white",
                color: msg.sender === user?.id ? "white" : "#3d3230",
                border: msg.sender === user?.id ? "none" : "1px solid #f2c4a0",
              }}
            >
              {msg.message && <p style={{ margin: 0 }}>{msg.message}</p>}
              {msg.photo && (
                <img src={msg.photo} style={{ width: "100%", borderRadius: 8, marginTop: msg.message ? 8 : 0 }} />
              )}
            </div>
            <span style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
              {new Date(msg.created_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: 16, borderTop: "1px solid #f2c4a0",
        display: "flex", gap: 8, alignItems: "center",
        background: "white",
      }}>
        <label style={{ cursor: "pointer", color: "#e07a5f" }}>
          <Camera size={24} />
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => setPhoto(e.target.files[0])}
          />
        </label>
        {photo && (
          <span style={{ fontSize: 12, color: "#e07a5f" }}>📎 {photo.name}</span>
        )}
        <input
          placeholder="メッセージを入力"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          style={{
            flex: 1, padding: "10px 14px",
            border: "1px solid #f2c4a0",
            borderRadius: 24, fontSize: 16, outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={handleSend}
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "#e07a5f", color: "white",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
