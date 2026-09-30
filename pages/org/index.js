import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Users2 } from "lucide-react"
import PageTitle from "../../components/PageTitle"

export default function OrgTeam() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState(null)
  const [org, setOrg] = useState(null)
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [teamName, setTeamName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [lastInviteLink, setLastInviteLink] = useState("")

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { router.push("/login"); return }

    const { data: profile } = await supabase
      .from("users").select("*").eq("id", userData.user.id).single()
    setMe(profile)
    setTeamName(profile?.organization || "")

    if (profile?.organization_id) {
      const { data: orgData } = await supabase
        .from("organizations").select("*").eq("id", profile.organization_id).single()
      setOrg(orgData)

      const { data: memberRows } = await supabase
        .from("users")
        .select("id, nickname, name, email, account_type")
        .eq("organization_id", profile.organization_id)
      setMembers(memberRows || [])

      const { data: inviteRows } = await supabase
        .from("organization_invites")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
      setInvites(inviteRows || [])
    } else {
      setOrg(null)
      setMembers([])
      setInvites([])
    }
    setLoading(false)
  }

  async function handleCreateTeam() {
    setError(""); setMessage("")
    if (!teamName.trim()) { setError("チーム名（団体名）を入力してください"); return }
    setBusy(true)
    const { data: userData } = await supabase.auth.getUser()

    const { data: created, error: createError } = await supabase
      .from("organizations")
      .insert({ name: teamName.trim(), created_by: userData.user.id })
      .select("id").single()

    if (createError) {
      setError("チーム作成に失敗しました: " + createError.message)
      setBusy(false)
      return
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ organization_id: created.id })
      .eq("id", userData.user.id)

    if (updateError) {
      setError("チームへの参加に失敗しました: " + updateError.message)
      setBusy(false)
      return
    }

    setMessage("チームを作成しました！")
    setBusy(false)
    load()
  }

  async function handleInvite() {
    setError(""); setMessage(""); setLastInviteLink("")
    if (!inviteEmail.trim()) { setError("招待するメールアドレスを入力してください"); return }
    setBusy(true)

    const { data: inserted, error: insertError } = await supabase
      .from("organization_invites")
      .insert({ organization_id: org.id, email: inviteEmail.trim(), invited_by: me.id })
      .select("token").single()

    if (insertError || !inserted?.token) {
      setError("招待の作成に失敗しました: " + (insertError?.message || ""))
      setBusy(false)
      return
    }
    const token = inserted.token

    const link = `${window.location.origin}/org/join/${token}`
    setLastInviteLink(link)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      // メール本文（宛先・チーム名・リンク）はAPI側でDBの招待レコードから
      // 取得し直すため、ここではtokenだけを送る（なりすまし送信対策）
      if (accessToken) {
        await fetch("/api/org/invite-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ token }),
        })
      }
    } catch (e) {
      // メール送信に失敗してもリンクは表示済みなので致命的ではない
    }

    setMessage("招待を作成しました。下のリンクを共有するか、メールをご確認ください。")
    setInviteEmail("")
    setBusy(false)
    load()
  }

  async function handleLeave() {
    if (!confirm("チームから抜けますか？あなたの投稿は残りますが、他メンバーは編集できなくなります。")) return
    setBusy(true)
    await supabase.from("users").update({ organization_id: null }).eq("id", me.id)
    setBusy(false)
    load()
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: "100px auto", padding: 24, textAlign: "center", color: "#9e7b6e" }}>
        読み込み中...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Users2 size={20} color="#e07a5f" />} title="チーム管理" />
      <p style={{ color: "#9e7b6e", marginBottom: 24, fontSize: 14, lineHeight: 1.8 }}>
        団体内の複数人（それぞれ自分のアカウントでログイン）が、同じ団体の投稿を
        一緒に編集できるようにする機能です。チームを作成し、メンバーを招待してください。
      </p>

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}
      {message && <p style={{ color: "#43a047", marginBottom: 12 }}>{message}</p>}

      {!org && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 8px", color: "#e07a5f", fontSize: 16 }}>チームを作成する</h3>
          <p style={{ fontSize: 13, color: "#9e7b6e", marginBottom: 12 }}>
            まだどのチームにも所属していません。チームを作成すると、あなたがオーナーになります。
          </p>
          <input
            placeholder="チーム名（例：〇〇地域猫の会）"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleCreateTeam} disabled={busy} style={buttonStyle}>
            {busy ? "作成中..." : "チームを作成する"}
          </button>
        </div>
      )}

      {org && (
        <>
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 4px", color: "#e07a5f", fontSize: 16 }}>{org.name}</h3>
            <p style={{ margin: 0, fontSize: 12, color: "#9e7b6e" }}>メンバー {members.length}人</p>
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 12px", color: "#e07a5f", fontSize: 16 }}>メンバー</h3>
            {members.map((m) => (
              <div key={m.id} style={memberRowStyle}>
                <span>{m.nickname || m.name || "（名前未設定）"}</span>
                {m.id === org.created_by && <span style={ownerBadge}>オーナー</span>}
                {m.id === me.id && <span style={meBadge}>あなた</span>}
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 12px", color: "#e07a5f", fontSize: 16 }}>メンバーを招待する</h3>
            <input
              type="email"
              placeholder="招待するメールアドレス"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={inputStyle}
            />
            <button onClick={handleInvite} disabled={busy} style={buttonStyle}>
              {busy ? "作成中..." : "招待を送る"}
            </button>

            {lastInviteLink && (
              <p style={{ fontSize: 12, color: "#9e7b6e", marginTop: 12, wordBreak: "break-all" }}>
                招待リンク: <a href={lastInviteLink}>{lastInviteLink}</a>
                <br />メールが届かない場合は、このリンクを直接共有してください（有効期限7日間）。
              </p>
            )}

            {invites.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 12, color: "#9e7b6e", marginBottom: 6 }}>招待中：</p>
                {invites.map((inv) => (
                  <p key={inv.id} style={{ fontSize: 13, margin: "0 0 4px", color: "#3d3230" }}>
                    {inv.email || "（メール未指定）"}
                  </p>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleLeave} disabled={busy} style={leaveButtonStyle}>
            チームから抜ける
          </button>
        </>
      )}

      <button onClick={() => router.push("/profile/edit")} style={backButtonStyle}>
        戻る
      </button>
    </div>
  )
}

const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16,
  padding: 20, marginBottom: 16, background: "white",
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
const leaveButtonStyle = {
  display: "block", width: "100%", padding: "12px", marginBottom: 8,
  background: "#fff0e8", color: "#c62828", border: "none",
  borderRadius: 12, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
}
const backButtonStyle = {
  display: "block", width: "100%", padding: "12px",
  background: "#f0e6e0", color: "#e07a5f", border: "none",
  borderRadius: 12, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
}
const memberRowStyle = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "8px 0", fontSize: 14, color: "#3d3230",
  borderBottom: "1px solid #f5e8e0",
}
const ownerBadge = {
  fontSize: 11, padding: "2px 8px", borderRadius: 10,
  background: "#fff3e0", color: "#e65100",
}
const meBadge = {
  fontSize: 11, padding: "2px 8px", borderRadius: 10,
  background: "#e8f5e9", color: "#2e7d32",
}
