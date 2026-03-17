import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useRouter } from "next/router"

export default function Register() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nickname, setNickname] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")

  async function handleRegister() {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      return
    }

    // usersテーブルにプロフィール保存
    await supabase.from("users").insert({
      id: data.user.id,
      email,
      nickname,
      name,
    })

    router.push("/map")
  }

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>会員登録</h1>

      <input
        placeholder="ニックネーム（必須）"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder="お名前（必須）"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder="メールアドレス（必須）"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder="パスワード（6文字以上）"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={inputStyle}
      />

      {error && (
        <p style={{ color: "red", marginBottom: 12 }}>{error}</p>
      )}

      <button onClick={handleRegister} style={buttonStyle}>
        登録する
      </button>

      <p style={{ marginTop: 16, textAlign: "center" }}>
        すでにアカウントをお持ちの方は
        <a href="/login" style={{ color: "#4a90e2" }}> ログイン</a>
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