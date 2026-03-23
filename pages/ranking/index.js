import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { Trophy } from "lucide-react"
import PageTitle from "../../components/PageTitle"

export default function Ranking() {
  const [tnrRanking, setTnrRanking] = useState([])
  const [sightingRanking, setSightingRanking] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRanking() {
      // TNR達成数ランキング
      const { data: tnrData } = await supabase
        .from("tnr_schedules")
        .select("organization")
        .eq("done", true)

      if (tnrData) {
        const counts = {}
        tnrData.forEach((t) => {
          const org = t.organization || "個人"
          counts[org] = (counts[org] || 0) + 1
        })
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }))
        setTnrRanking(sorted)
      }

      // 目撃情報投稿数ランキング
      const { data: sightingData } = await supabase
        .from("sightings")
        .select("created_by, users(nickname, name, organization)")

      if (sightingData) {
        const counts = {}
        sightingData.forEach((s) => {
          const name = s.users?.organization || s.users?.nickname || s.users?.name || "匿名"
          counts[name] = (counts[name] || 0) + 1
        })
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }))
        setSightingRanking(sorted)
      }

      setLoading(false)
    }
    loadRanking()
  }, [])

  const medals = ["🥇", "🥈", "🥉"]

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Trophy size={20} color="#e07a5f" />} title="地域ランキング" />
      <p style={{ color: "#9e7b6e", marginBottom: 32, fontSize: 14 }}>
        地域猫活動への貢献ランキングです。
      </p>

      {loading && <p style={{ textAlign: "center", color: "#999" }}>読み込み中...</p>}

      <div style={cardStyle}>
        <h2 style={{ margin: "0 0 16px", fontSize: 18, color: "#e07a5f" }}>
          ✂️ TNR達成数ランキング
        </h2>
        {tnrRanking.length === 0 && (
          <p style={{ color: "#999", fontSize: 14 }}>まだデータがありません</p>
        )}
        {tnrRanking.map((item, i) => (
          <div key={i} style={rankRow}>
            <span style={{ fontSize: 20, width: 32 }}>
              {medals[i] || `${i + 1}`}
            </span>
            <span style={{ flex: 1, fontSize: 15 }}>{item.name}</span>
            <span style={{ fontWeight: 700, color: "#e07a5f", fontSize: 16 }}>
              {item.count}頭
            </span>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <h2 style={{ margin: "0 0 16px", fontSize: 18, color: "#e07a5f" }}>
          👀 目撃情報投稿数ランキング
        </h2>
        {sightingRanking.length === 0 && (
          <p style={{ color: "#999", fontSize: 14 }}>まだデータがありません</p>
        )}
        {sightingRanking.map((item, i) => (
          <div key={i} style={rankRow}>
            <span style={{ fontSize: 20, width: 32 }}>
              {medals[i] || `${i + 1}`}
            </span>
            <span style={{ flex: 1, fontSize: 15 }}>{item.name}</span>
            <span style={{ fontWeight: 700, color: "#e07a5f", fontSize: 16 }}>
              {item.count}件
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16,
  padding: 20, marginBottom: 24, background: "white",
}
const rankRow = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "10px 0", borderBottom: "1px solid #fff0e8",
}
