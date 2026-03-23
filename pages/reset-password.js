import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useRouter } from "next/router"

export default function ResetPassword() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleRequest() {
    if (!email) { setError("メールアドレスを入力してください"); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://neko-map-app.vercel.app/reset-password?mode=update",
    })
    if (error) {
      setError("送信に失敗しました: " + error.message)
    } else {
      setMessage("パスワードリセット用のメールを送信しました。メールをご確認ください。")
    }
    setLoading(false)
  }

  async function handleUpdate() {
    if (!newPassword || newPassword.length < 6) {
      setError("6文字以上のパスワードを入力してください")
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setError("更新に失敗しました: " + error.message)
    } else {
      setMessage("パスワードを更新しました！")
      setTimeout(() => router.push("/map"), 2000)
    }
    setLoading(false)
  }

  const isUpdateMode = router.query.mode === "update"

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <img src="/cat-icon.png" alt="NekoMap" style={{ width: 64, height: 64, objectFit: "contain", marginBottom: 8 }} />
        <h1 style={{ color: "#e07a5f", fontSize: 24 }}>
          {isUpdateMode ? "新しいパスワードを設定" : "パスワードをお忘れの方"}
        </h1>
      </div>

      {!isUpdateMode ? (
        <>
          <p style={{ color: "#9e7b6e", fontSize: 14, marginBottom: 16 }}>
            登録したメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
          </p>
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}
          {message && <p style={{ color: "#43a047", marginBottom: 12 }}>{message}</p>}
          <button onClick={handleRequest} disabled={loading} style={buttonStyle}>
            {loading ? "送信中..." : "リセットメールを送信"}
          </button>
        </>
      ) : (
        <>
          <p style={{ color: "#9e7b6e", fontSize: 14, marginBottom: 16 }}>
            新しいパスワードを入力してください。
          </p>
          <input
            type="password"
            placeholder="新しいパスワード（6文字以上）"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={inputStyle}
          />
          {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}
          {message && <p style={{ color: "#43a047", marginBottom: 12 }}>{message}</p>}
          <button onClick={handleUpdate} disabled={loading} style={buttonStyle}>
            {loading ? "更新中..." : "パスワードを更新"}
          </button>
        </>
      )}

      <button
        onClick={() => router.push("/login")}
        style={{ ...buttonStyle, background: "#f0e6e0", color: "#e07a5f", marginTop: 8 }}
      >
        ログインに戻る
      </button>
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
  marginBottom: 0,
}
