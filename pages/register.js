import { useState, useRef } from "react"
import { supabase } from "../lib/supabase"
import { useRouter } from "next/router"

export default function Register() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nickname, setNickname] = useState("")
  const [name, setName] = useState("")
  const [organization, setOrganization] = useState("")
  const [website, setWebsite] = useState("")
  const [donationInfo, setDonationInfo] = useState("")
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef(null)
  const [agreed, setAgreed] = useState(false)

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setAvatar(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleRegister() {
    if (!agreed) { setError("利用規約とプライバシーポリシーへの同意が必要です"); return }
    if (!nickname) { setError("ニックネームを入力してください"); return }
    if (!name) { setError("お名前を入力してください"); return }
    if (!email) { setError("メールアドレスを入力してください"); return }
    if (password.length < 6) { setError("パスワードは6文字以上で入力してください"); return }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: "https://neko-map-app.vercel.app/map" }
    })

    if (error) { setError(error.message); setLoading(false); return }

    let avatarUrl = null
    if (avatar) {
      const fileName = `avatars/${data.user.id}_${Date.now()}`
      const { error: uploadError } = await supabase.storage
        .from("cat-photos").upload(fileName, avatar)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("cat-photos").getPublicUrl(fileName)
        avatarUrl = urlData.publicUrl
      }
    }

    await supabase.from("users").insert({
      id: data.user.id,
      email, nickname, name,
      organization: organization || null,
      website: website || null,
      donation_info: donationInfo || null,
      avatar: avatarUrl,
      account_type: "general",
      role: "user",
    })

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div style={{ maxWidth: 400, margin: "100px auto", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📧</div>
        <h2 style={{ color: "#e07a5f", marginBottom: 16 }}>確認メールを送信しました</h2>
        <p style={{ color: "#9e7b6e", fontSize: 14, lineHeight: 1.8 }}>
          <b>{email}</b> に確認メールを送信しました。<br />
          メール内のリンクをクリックして登録を完了してください。
        </p>
        <button onClick={() => router.push("/login")} style={buttonStyle}>
          ログインへ
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🐱</div>
        <h1 style={{ color: "#e07a5f", fontSize: 28 }}>NekoMap</h1>
        <p style={{ color: "#9e7b6e", fontSize: 14 }}>新規会員登録</p>
      </div>

      {/* アバター */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div
          onClick={() => fileRef.current.click()}
          style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "#f0e6e0", margin: "0 auto 8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, cursor: "pointer", overflow: "hidden",
            border: "2px solid #f2c4a0",
          }}
        >
          {avatarPreview ? (
            <img src={avatarPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : "🐱"}
        </div>
        <p style={{ fontSize: 12, color: "#9e7b6e" }}>タップしてアバター画像を設定（任意）</p>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
      </div>

      <p style={{ fontSize: 13, color: "#e07a5f", fontWeight: 500, marginBottom: 8 }}>必須項目</p>
      <input placeholder="ニックネーム（公開されます）" value={nickname} onChange={(e) => setNickname(e.target.value)} style={inputStyle} />
      <input placeholder="代表者名・お名前（非公開）" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      <input type="email" placeholder="メールアドレス（非公開）" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
      <input type="password" placeholder="パスワード（6文字以上）" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />

      <p style={{ fontSize: 13, color: "#9e7b6e", fontWeight: 500, marginBottom: 8, marginTop: 8 }}>任意項目</p>
      <input placeholder="団体名" value={organization} onChange={(e) => setOrganization(e.target.value)} style={inputStyle} />
      <input placeholder="ホームページURL" value={website} onChange={(e) => setWebsite(e.target.value)} style={inputStyle} />
      <textarea
        placeholder="寄付情報（例：○○銀行への振込、Amazonほしいものリストなど）"
        value={donationInfo}
        onChange={(e) => setDonationInfo(e.target.value)}
        style={{ ...inputStyle, height: 80 }}
      />

      <p style={{ fontSize: 12, color: "#9e7b6e", marginBottom: 16, lineHeight: 1.6 }}>
        ※ 公開される情報はニックネーム・団体名・ホームページ・寄付情報のみです。<br />
        ※ 登録後、確認メールが届きます。<br />
        ※ 団体・活動者へのレベルアップは管理者が審査後に行います。
      </p>

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <label style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        marginBottom: 16, cursor: "pointer", fontSize: 13, color: "#9e7b6e",
      }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          style={{ marginTop: 2, width: 16, height: 16 }}
        />
        <span>
          <a href="/terms" target="_blank" style={{ color: "#e07a5f" }}>利用規約</a>
          および
          <a href="/privacy" target="_blank" style={{ color: "#e07a5f" }}>プライバシーポリシー</a>
          に同意します（必須）
        </span>
      </label>

      <button onClick={handleRegister} disabled={loading} style={buttonStyle}>
        {loading ? "登録中..." : "登録する"}
      </button>
      <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "#9e7b6e" }}>
        すでにアカウントをお持ちの方は{" "}
        <a href="/login" style={{ color: "#e07a5f" }}>ログイン</a>
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
  marginTop: 8,
}