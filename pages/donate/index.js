import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { Heart } from "lucide-react"
import PageTitle from "../../components/PageTitle"

export default function Donate() {
  const [orgs, setOrgs] = useState([])

  useEffect(() => {
    async function loadOrgs() {
      const { data } = await supabase
        .from("users")
        .select("id, nickname, name, organization, website, donation_info, donation_bank, donation_amazon, account_type")
        .order("created_at", { ascending: false })
      setOrgs((data || []).filter((o) =>
        o.donation_info || o.donation_bank || o.donation_amazon
      ))
    }
    loadOrgs()
  }, [])

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Heart size={20} color="#e07a5f" />} title="寄付・支援" />
      <p style={{ color: "#9e7b6e", marginBottom: 32, fontSize: 14 }}>
        地域猫活動を支援する団体・個人への寄付情報です。
      </p>

      {orgs.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>寄付情報の登録はまだありません</p>
      )}

      {orgs.map((org) => (
        <div key={org.id} style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "#f0e6e0", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 24,
            }}>
              🐱
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                {org.organization || org.nickname || org.name}
              </h3>
              {org.account_type === "organization" && (
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 10,
                  background: "#e8f5e9", color: "#2e7d32",
                }}>
                  ✅ 認証済み団体
                </span>
              )}
            </div>
          </div>

          {org.donation_info && (
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "#444" }}>
              {org.donation_info}
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {org.website && (
              <a href={org.website} target="_blank" rel="noopener noreferrer" style={linkOrange}>
                🌐 ホームページ・寄付ページへ
              </a>
            )}
            {org.donation_bank && (
              <div style={infoBox}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>🏦 銀行振込</p>
                <p style={{ margin: 0, fontSize: 13, color: "#444", whiteSpace: "pre-wrap" }}>
                  {org.donation_bank}
                </p>
              </div>
            )}
            {org.donation_amazon && (
              <a href={org.donation_amazon} target="_blank" rel="noopener noreferrer" style={linkAmber}>
                📦 Amazonほしいものリスト
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16,
  padding: 20, marginBottom: 16, background: "white",
}
const infoBox = {
  padding: 12, background: "#fff9f5",
  borderRadius: 10, border: "1px solid #f2c4a0",
}
const linkOrange = {
  display: "block", padding: "10px 16px",
  background: "#e07a5f", color: "white",
  borderRadius: 10, textAlign: "center",
  fontSize: 14, textDecoration: "none",
}
const linkAmber = {
  display: "block", padding: "10px 16px",
  background: "#f90", color: "white",
  borderRadius: 10, textAlign: "center",
  fontSize: 14, textDecoration: "none",
}
