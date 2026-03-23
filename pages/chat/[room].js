import { useEffect, useState, useRef } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Send, Camera } from "lucide-react"

export default function ChatRoom() {
  const router = useRouter()
  const { room } = router.query
  const [messages, setMessages] = useState([])
  const [text, setText] = useState("")
  const [user, setUser] = useState(null)
  const [photo, setPhoto] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }
    init()
  }, [])

  useEffect(() => {
    if (!room) return

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
  }, [room])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    if (!text.trim() && !photo) return

    let photoUrl = null
    if (photo) {
      const fileName = `${Date.now()}_${photo.name}`
      const { error: uploadError } = await supabase.storage
        .from("cat-photos")
        .upload(fileName, photo)
      if (!uploadError) {
        const { data } = supabase.storage.from("cat-photos").getPublicUrl(fileName)
        photoUrl = data.publicUrl
      }
      setPhoto(null)
    }

    await supabase.from("chats").insert({
      room_id: room,
      sender: user?.id,
      message: text,
      photo: photoUrl,
    })
    setText("")
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{
        padding: "16px 24px", borderBottom: "1px solid #f2c4a0",
        display: "flex", alignItems: "center", gap: 12,
        background: "rgba(255,249,245,0.95)",
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#e07a5f", fontSize: 16, fontFamily: "inherit" }}
        >
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: 18, color: "#3d3230" }}>チャット</h2>
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
