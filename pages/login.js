import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useRouter } from "next/router"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("メールアドレスまたはパスワードが間違っています")
      return
    }

    router.push("/map")
  }

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>ログイン</h1>

      <input
        placeholder="メールアドレス"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder="パスワード"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={inputStyle}
      />

      {error && (
        <p style={{ color: "red", marginBottom: 12 }}>{error}</p>
      )}

      <button onClick={handleLogin} style={buttonStyle}>
        ログイン
      </button>

      <p style={{ marginTop: 16, textAlign: "center" }}>
        アカウントをお持ちでない方は
        <a href="/register" style={{ color: "#4a90e2" }}> 新規登録</a>
      </p>
    </div>
  )
}

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  marginBottom: 12,
  border: "1px solid #ddd",
  borderRadius: 8,
  fontSize: 16,
  boxSizing: "border-box",
}

const buttonStyle = {
  display: "block",
  width: "100%",
  padding: "12px",
  background: "#4a90e2",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 16,
  cursor: "pointer",
}