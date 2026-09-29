import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/router"
import { Users2 } from "lucide-react"
import PageTitle from "../../../components/PageTitle"

export default function JoinOrg() {
  const router = useRouter()
  const { token } = router.query
  const [checking, setChecking] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState(null)

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getUser()
      setLoggedIn(!!data.user)
      setChecking(false)
    }
    check()
  }, [])

  async function handleAccept() {
    if (!token) return
    setBusy(true)
    setError("")
    const { data, error: rpcError } = await supabase.rpc("accept_org_invite", { invite_token: token })
    if (rpcError) {
      setError(rpcError.message || "招待の受け入れに失敗しました")
      setBusy(false)
      return
    }
    setResult(data)
    setBusy(false)
  }

  return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, textAlign: "center" }}>
      <PageTitle icon={<Users2 size={20} color="#e07a5f" />} title="チームへの招待" />

      {checking && <p style={{ color: "#9e7b6e" }}>確認中...</p>}

      {!checking && !loggedIn && (
        <>
          <p style={{ color: "#9e7b6e", marginBottom: 16, lineHeight: 1.8 }}>
            チームに参加するには、先にログイン（またはアカウント登録）してから、
            もう一度このリンクを開いてください。
          </p>
          <button onClick={() => router.push("/login")} style={buttonStyle}>ログインする</button>
          <button onClick={() => router.push("/register")} style={{ ...buttonStyle, background: "#f0e6e0", color: "#e07a5f", marginTop: 8 }}>
            新規登録する
          </button>
        </>
      )}

      {!checking && loggedIn && !result && (
        <>
          <p style={{ color: "#9e7b6e", marginBottom: 16, lineHeight: 1.8 }}>
            チームに参加すると、そのチームの猫情報・投稿をメンバーとして
            編集できるようになります。
          </p>
          {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}
          <button onClick={handleAccept} disabled={busy} style={buttonStyle}>
            {busy ? "参加中..." : "チームに参加する"}
          </button>
        </>
      )}

      {result && (
        <>
          <p style={{ color: "#43a047", marginBottom: 16 }}>
            「{result.organization_name}」に参加しました！
          </p>
          <button onClick={() => router.push("/org")} style={buttonStyle}>チーム管理へ</button>
        </>
      )}
    </div>
  )
}

const buttonStyle = {
  display: "block", width: "100%", padding: "12px",
  background: "#e07a5f", color: "white", border: "none",
  borderRadius: 12, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
}
