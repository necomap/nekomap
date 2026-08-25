import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useRouter } from "next/router"
import { Eye, EyeOff } from "lucide-react"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

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

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/map` },
    })
    if (error) {
      setError("Googleログインに失敗しました: " + error.message)
      setGoogleLoading(false)
    }
    // 成功時はGoogleの認証画面へ遷移するのでここでのloading解除は不要
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
      <div style={{ position: "relative" }}>
        <input
          type={showPassword ? "text" : "password"}
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          style={{ ...inputStyle, paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
          style={eyeButtonStyle}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <button onClick={handleLogin} disabled={loading} style={buttonStyle}>
        {loading ? "ログイン中..." : "ログイン"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
        <div style={{ flex: 1, height: 1, background: "#f2c4a0" }} />
        <span style={{ fontSize: 12, color: "#9e7b6e" }}>または</span>
        <div style={{ flex: 1, height: 1, background: "#f2c4a0" }} />
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        style={googleButtonStyle}
      >
        <GoogleIcon />
        {googleLoading ? "接続中..." : "Googleでログイン"}
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 8 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.85.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}

const inputStyle = {
  display: "block", width: "100%", padding: "10px 12px",
  marginBottom: 12, border: "1px solid #f2c4a0", borderRadius: 12,
  fontSize: 16, boxSizing: "border-box", fontFamily: "inherit",
}
const eyeButtonStyle = {
  position: "absolute", right: 8, top: "50%", transform: "translateY(-58%)",
  background: "none", border: "none", cursor: "pointer",
  color: "#9e7b6e", padding: 6, display: "flex", alignItems: "center",
}
const buttonStyle = {
  display: "block", width: "100%", padding: "12px",
  background: "#e07a5f", color: "white", border: "none",
  borderRadius: 12, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
}
const googleButtonStyle = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: "100%", padding: "12px",
  background: "white", color: "#3d3230", border: "1px solid #f2c4a0",
  borderRadius: 12, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
}
