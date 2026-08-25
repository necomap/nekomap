import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { Trophy } from "lucide-react"
import PageTitle from "../../components/PageTitle"
import { POINTS, getBadge, getPeriodCutoff } from "../../lib/badges"

const PERIODS = [
  { value: "all", label: "累計" },
  { value: "month", label: "今月" },
  { value: "week", label: "今週" },
]

export default function Ranking() {
  const [period, setPeriod] = useState("all")
  const [loading, setLoading] = useState(true)
  const [totalRanking, setTotalRanking] = useState([])
  const [categoryRankings, setCategoryRankings] = useState({
    tnr: [], sighting: [], post: [], rescue: [], resolved: [], volunteerApp: [],
  })

  useEffect(() => {
    loadRanking(period)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  async function loadRanking(currentPeriod) {
    setLoading(true)
    const cutoff = getPeriodCutoff(currentPeriod)

    // 表示名解決用にユーザー一覧を先に取得
    const { data: usersData } = await supabase
      .from("users").select("id, nickname, name, organization")
    const nameOf = (id) => {
      const u = usersData?.find((x) => x.id === id)
      return u?.organization || u?.nickname || u?.name || "匿名"
    }

    function applyCutoff(query, column = "created_at") {
      return cutoff ? query.gte(column, cutoff) : query
    }

    // 1. TNR達成数（団体名ベース。従来通り organization 単位で集計）
    let tnrQuery = supabase.from("tnr_schedules").select("organization, created_at").eq("done", true)
    const { data: tnrData } = await applyCutoff(tnrQuery)
    const tnrCounts = {}
    tnrData?.forEach((t) => {
      const org = t.organization || "個人"
      tnrCounts[org] = (tnrCounts[org] || 0) + 1
    })

    // 2. 目撃情報投稿数
    let sightingQuery = supabase.from("sightings").select("created_by, created_at")
    const { data: sightingData } = await applyCutoff(sightingQuery)
    const sightingCounts = {}
    sightingData?.forEach((s) => {
      if (!s.created_by) return
      sightingCounts[s.created_by] = (sightingCounts[s.created_by] || 0) + 1
    })

    // 3. 掲示板投稿数（全カテゴリ）＋ 4. 保護・救助報告数（category=rescue）
    let postQuery = supabase.from("posts").select("created_by, category, created_at")
    const { data: postData } = await applyCutoff(postQuery)
    const postCounts = {}
    const rescueCounts = {}
    postData?.forEach((p) => {
      if (!p.created_by) return
      postCounts[p.created_by] = (postCounts[p.created_by] || 0) + 1
      if (p.category === "rescue") {
        rescueCounts[p.created_by] = (rescueCounts[p.created_by] || 0) + 1
      }
    })

    // 5. 困りごと解決数
    let resolvedQuery = supabase.from("trouble_reports").select("volunteer_id, created_at").eq("status", "解決")
    const { data: resolvedData } = await applyCutoff(resolvedQuery)
    const resolvedCounts = {}
    resolvedData?.forEach((r) => {
      if (!r.volunteer_id) return
      resolvedCounts[r.volunteer_id] = (resolvedCounts[r.volunteer_id] || 0) + 1
    })

    // 6. ボランティア応募数
    let volQuery = supabase.from("volunteer_applications").select("applicant, created_at")
    const { data: volData } = await applyCutoff(volQuery)
    const volCounts = {}
    volData?.forEach((v) => {
      if (!v.applicant) return
      volCounts[v.applicant] = (volCounts[v.applicant] || 0) + 1
    })

    // 総合貢献度スコア（TNRは団体名ベースなので個人集計には含めない）
    const totalScores = {}
    function addScore(counts, weight) {
      Object.entries(counts).forEach(([id, count]) => {
        totalScores[id] = (totalScores[id] || 0) + count * weight
      })
    }
    addScore(sightingCounts, POINTS.sighting)
    addScore(postCounts, POINTS.post)
    addScore(rescueCounts, POINTS.rescue)
    addScore(resolvedCounts, POINTS.resolved)
    addScore(volCounts, POINTS.volunteerApp)

    const toSortedList = (counts, unit, resolveNameById = true) =>
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, count]) => ({
          name: resolveNameById ? nameOf(key) : key,
          count,
          unit,
        }))

    setTotalRanking(
      Object.entries(totalScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, score]) => ({ name: nameOf(id), score, badge: getBadge(score) }))
    )

    setCategoryRankings({
      tnr: toSortedList(tnrCounts, "頭", false),
      sighting: toSortedList(sightingCounts, "件"),
      post: toSortedList(postCounts, "件"),
      rescue: toSortedList(rescueCounts, "件"),
      resolved: toSortedList(resolvedCounts, "件"),
      volunteerApp: toSortedList(volCounts, "件"),
    })

    setLoading(false)
  }

  const medals = ["🥇", "🥈", "🥉"]

  function RankingCard({ title, icon, items }) {
    return (
      <div style={cardStyle}>
        <h2 style={{ margin: "0 0 16px", fontSize: 17, color: "#e07a5f" }}>
          {icon} {title}
        </h2>
        {items.length === 0 && (
          <p style={{ color: "#999", fontSize: 14 }}>まだデータがありません</p>
        )}
        {items.map((item, i) => (
          <div key={i} style={rankRow}>
            <span style={{ fontSize: 20, width: 32 }}>{medals[i] || `${i + 1}`}</span>
            <span style={{ flex: 1, fontSize: 15 }}>{item.name}</span>
            <span style={{ fontWeight: 700, color: "#e07a5f", fontSize: 16 }}>
              {item.count}{item.unit}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Trophy size={20} color="#e07a5f" />} title="地域ランキング" />
      <p style={{ color: "#9e7b6e", marginBottom: 20, fontSize: 14 }}>
        地域猫活動への貢献ランキングです。
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            style={{
              padding: "6px 16px", borderRadius: 20, fontSize: 13,
              border: "none", cursor: "pointer", fontFamily: "inherit",
              background: period === p.value ? "#e07a5f" : "#f0e6e0",
              color: period === p.value ? "white" : "#3d3230",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ textAlign: "center", color: "#999" }}>読み込み中...</p>}

      <div style={{ ...cardStyle, background: "linear-gradient(135deg, #fff9f5, #fff0e8)" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, color: "#e07a5f" }}>
          🏆 総合貢献度ランキング
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "#9e7b6e" }}>
          目撃投稿・掲示板投稿・保護報告・困りごと解決・ボランティア応募を合算したスコアです
        </p>
        {totalRanking.length === 0 && (
          <p style={{ color: "#999", fontSize: 14 }}>まだデータがありません</p>
        )}
        {totalRanking.map((item, i) => (
          <div key={i} style={rankRow}>
            <span style={{ fontSize: 20, width: 32 }}>{medals[i] || `${i + 1}`}</span>
            <span style={{ fontSize: 20, width: 28 }}>{item.badge.emoji}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 15 }}>{item.name}</span>
              <p style={{ margin: 0, fontSize: 11, color: "#9e7b6e" }}>{item.badge.label}</p>
            </div>
            <span style={{ fontWeight: 700, color: "#e07a5f", fontSize: 16 }}>
              {item.score}pt
            </span>
          </div>
        ))}
      </div>

      <RankingCard title="TNR達成数ランキング" icon="✂️" items={categoryRankings.tnr} />
      <RankingCard title="目撃情報投稿数ランキング" icon="👀" items={categoryRankings.sighting} />
      <RankingCard title="掲示板投稿数ランキング" icon="📋" items={categoryRankings.post} />
      <RankingCard title="保護・救助報告数ランキング" icon="🏠" items={categoryRankings.rescue} />
      <RankingCard title="困りごと解決数ランキング" icon="✅" items={categoryRankings.resolved} />
      <RankingCard title="ボランティア応募数ランキング" icon="🙋" items={categoryRankings.volunteerApp} />
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
