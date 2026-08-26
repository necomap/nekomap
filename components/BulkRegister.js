import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function BulkRegister() {
  const [nickname, setNickname] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [organization, setOrganization] = useState("")
  const [website, setWebsite] = useState("")
  const [accountType, setAccountType] = useState("activist")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleRegister() {
    if (!email || !password || !nickname) {
      setError("メールアドレス・パスワード・ニックネームは必須です")
      return
    }
    setLoading(true)
    setError("")
    setMessage("")

    // 代行登録はブラウザ側でsignUpせず、サーバー側API（サービスロールキー使用）
    // に処理を任せる。ブラウザ側でsignUpすると、管理者自身が使っている
    // Supabaseクライアントのセッションが新規ユーザーのものに置き換わってしまい、
    // 管理者が意図せずログアウトされてしまうため。
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token

    if (!accessToken) {
      setError("ログイン状態を確認できませんでした。再度ログインしてください")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/admin/bulk-register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email, password, nickname, name,
          organization, website, accountType,
        }),
      })
      const result = await res.json()

      if (!res.ok) {
        setError(result.error || "登録に失敗しました")
        setLoading(false)
        return
      }

      setMessage(`✅ ${nickname}（${email}）を登録しました！`)
      setNickname("")
      setName("")
      setEmail("")
      setPassword("")
      setOrganization("")
      setWebsite("")
    } catch (e) {
      setError("通信エラーが発生しました: " + e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 480, padding: 16 }}>
      <h2 style={{ marginBottom: 16, color: "#e07a5f" }}>👤 代行登録</h2>
      <p style={{ fontSize: 13, color: "#9e7b6e", marginBottom: 16 }}>
        忙しい団体さんに代わって管理者が登録できます。
      </p>

      <select value={accountType} onChange={(e) => setAccountType(e.target.value)} style={inputStyle}>
        <option value="activist">🙋 活動者</option>
        <option value="organization">🏢 団体</option>
      </select>

      <input placeholder="ニックネーム（必須）" value={nickname} onChange={(e) => setNickname(e.target.value)} style={inputStyle} />
      <input placeholder="代表者名" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      <input placeholder="団体名" value={organization} onChange={(e) => setOrganization(e.target.value)} style={inputStyle} />
      <input placeholder="ホームページURL" value={website} onChange={(e) => setWebsite(e.target.value)} style={inputStyle} />
      <input type="email" placeholder="メールアドレス（必須）" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
      <input type="password" placeholder="仮パスワード（必須・6文字以上）" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />

      <p style={{ fontSize: 12, color: "#9e7b6e", marginBottom: 12 }}>
        ※ 登録後、本人にメールアドレスとパスワードをお知らせください。
      </p>

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}
      {message && <p style={{ color: "#43a047", marginBottom: 12 }}>{message}</p>}

      <button onClick={handleRegister} disabled={loading} style={buttonStyle}>
        {loading ? "登録中..." : "代行登録する"}
      </button>
    </div>
  )
}

const inputStyle = {
  display: "block", width: "100%", padding: "10px 12px",
  marginBottom: 12, border: "1px solid #f2c4a0", borderRadius: 12,
  fontSize: 15, boxSizing: "border-box", fontFamily: "inherit",
}
const buttonStyle = {
  display: "block", width: "100%", padding: "12px",
  background: "#e07a5f", color: "white", border: "none",
  borderRadius: 12, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
}
