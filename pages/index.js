import { useRouter } from "next/router"

export default function Home() {
  const router = useRouter()

  return (
    <div style={{ minHeight: "100vh", background: "#fafaf8" }}>
      <div style={{
        maxWidth: 480, margin: "0 auto", padding: "60px 24px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🐱</div>
        <h1 style={{ fontSize: 32, marginBottom: 8, color: "#333" }}>NekoMap</h1>
        <p style={{ color: "#666", marginBottom: 48, fontSize: 16 }}>
          地域猫の情報をみんなでシェアしよう
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={() => router.push("/map")} style={primaryButton}>
            🗺️ 地図を見る
          </button>
          <button onClick={() => router.push("/cats")} style={primaryButton}>
            🐱 地域猫一覧
          </button>
          <button onClick={() => router.push("/board")} style={primaryButton}>
            📋 掲示板
          </button>
          <button onClick={() => router.push("/sightings/new")} style={secondaryButton}>
            📍 目撃情報を投稿
          </button>
          <button onClick={() => router.push("/login")} style={secondaryButton}>
            ログイン / 会員登録
          </button>
        </div>
      </div>
    </div>
  )
}

const primaryButton = {
  padding: "14px", background: "#4a90e2", color: "white",
  border: "none", borderRadius: 12, fontSize: 16, cursor: "pointer",
}
const secondaryButton = {
  padding: "14px", background: "white", color: "#4a90e2",
  border: "2px solid #4a90e2", borderRadius: 12, fontSize: 16, cursor: "pointer",
}