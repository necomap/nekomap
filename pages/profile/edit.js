import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/router"
import { Settings } from "lucide-react"
import PageTitle from "../../components/PageTitle"

export default function EditProfile() {
  const router = useRouter()
  const [profile, setProfile] = useState({
    nickname: "", name: "", organization: "",
    website: "", donation_info: "",
    donation_bank: "", donation_amazon: "",
    account_type: "general",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function loadProfile() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push("/login"); return }
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", userData.user.id)
        .single()
      if (data) setProfile(data)
    }
    loadProfile()
  }, [])

  async function handleSave() {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase
      .from("users")
      .update({
        nickname: profile.nickname,
        name: profile.name,
        organization: profile.organization,
        website: profile.website,
        donation_info: profile.donation_info,
        donation_bank: profile.donation_bank,
        donation_amazon: profile.donation_amazon,
      })
      .eq("id", userData.user.id)

    if (error) {
      setMessage("保存に失敗しました")
    } else {
      setMessage("保存しました！")
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Settings size={20} color="#e07a5f" />} title="プロフィール編集" />

      <p style={{ fontSize: 13, color: "#9e7b6e", marginBottom: 16 }}>
        ※ 公開される情報：団体名・ホームページ・担当地域・寄付情報のみです。
        住所・電話・メール等は非公開です。
      </p>

      <label style={labelStyle}>ニックネーム</label>
      <input value={profile.nickname || ""} onChange={(e) => setProfile({ ...profile, nickname: e.target.value })} style={inputStyle} />

      <label style={labelStyle}>お名前</label>
      <input value={profile.name || ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} style={inputStyle} />

      <label style={labelStyle}>団体名</label>
      <input value={profile.organization || ""} onChange={(e) => setProfile({ ...profile, organization: e.target.value })} style={inputStyle} />

      <label style={labelStyle}>ホームページ</label>
      <input placeholder="https://" value={profile.website || ""} onChange={(e) => setProfile({ ...profile, website: e.target.value })} style={inputStyle} />

      <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #f2c4a0" }} />
      <h3 style={{ marginBottom: 16, color: "#e07a5f" }}>💝 寄付情報（任意）</h3>

      <label style={labelStyle}>寄付についての説明</label>
      <textarea
        placeholder="例：地域猫のTNR活動のための支援をお願いします"
        value={profile.donation_info || ""}
        onChange={(e) => setProfile({ ...profile, donation_info: e.target.value })}
        style={{ ...inputStyle, height: 80 }}
      />

      <label style={labelStyle}>銀行振込情報</label>
      <textarea
        placeholder="例：○○銀行 △△支店 普通 1234567 団体名"
        value={profile.donation_bank || ""}
        onChange={(e) => setProfile({ ...profile, donation_bank: e.target.value })}
        style={{ ...inputStyle, height: 80 }}
      />

      <label style={labelStyle}>Amazonほしいものリスト URL</label>
      <input
        placeholder="https://www.amazon.co.jp/hz/wishlist/..."
        value={profile.donation_amazon || ""}
        onChange={(e) => setProfile({ ...profile, donation_amazon: e.target.value })}
        style={inputStyle}
      />

      {message && (
        <p style={{ color: message.includes("失敗") ? "red" : "#43a047", marginBottom: 12 }}>
          {message}
        </p>
      )}

      <button onClick={handleSave} disabled={loading} style={buttonStyle}>
        {loading ? "保存中..." : "保存する"}
      </button>
      <button onClick={() => router.back()} style={{ ...buttonStyle, background: "#f0e6e0", color: "#e07a5f", marginTop: 8 }}>
        戻る
      </button>
    </div>
  )
}

const labelStyle = {
  display: "block", fontSize: 13, color: "#9e7b6e", marginBottom: 4,
}
const inputStyle = {
  display: "block", width: "100%", padding: "10px 12px",
  marginBottom: 16, border: "1px solid #f2c4a0", borderRadius: 12,
  fontSize: 16, boxSizing: "border-box", fontFamily: "inherit",
  background: "white",
}
const buttonStyle = {
  display: "block", width: "100%", padding: "12px",
  background: "#e07a5f", color: "white", border: "none",
  borderRadius: 12, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
}
