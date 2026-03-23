import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useRouter } from "next/router"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("メールアドレスまたはパスワードが間違っています")
      setLoading(false)
      return
    }
    router.push("/map")
  }

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <img src="/cat-icon.png" alt="NekoMap" style={{ width: 64, height: 64, objectFit: "contain", marginBottom: 8 }} />
        <h1 style={{ color: "#e07a5f", fontSize: 28 }}>NekoMap</h1>
        <p style={{ color: "#9e7b6e", fontSize: 14 }}>ログイン</p>
      </div>

      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        style={inputStyle}
      />

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <button onClick={handleLogin} disabled={loading} style={buttonStyle}>
        {loading ? "ログイン中..." : "ログイン"}
      </button>

      <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "#9e7b6e" }}>
        <a href="/reset-password" style={{ color: "#e07a5f" }}>パスワードをお忘れの方</a>
      </p>
      <p style={{ textAlign: "center", fontSize: 14, color: "#9e7b6e" }}>
        アカウントをお持ちでない方は{" "}
        <a href="/register" style={{ color: "#e07a5f" }}>新規登録</a>
      </p>
    </div>
  )
}

const inputStyle = {
  display: "block", width: "100%", padding: "10px 12px",
  marginBottom: 12, border: "1px solid #f2c4a0", borderRadius: 12,
  fontSize: 16, boxSizing: "border-box", fontFamily: "inherit",
}
const buttonStyle = {
  display: "block", width: "100%", padding: "12px",
  background: "#e07a5f", color: "white", border: "none",
  borderRadius: 12, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
}
