import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { BarChart3, Scissors, Cat, Tag } from "lucide-react"
import PageTitle from "../../components/PageTitle"

// 地域別 活動統計ダッシュボード。
// 都道府県ごとの困りごと解決数・里親成立数・ボランティア募集数・掲示板投稿数を
// get_region_stats() RPC（SECURITY DEFINER、件数のみでPIIを含まないため公開可）
// から取得し、棒グラフ＋データテーブルで表示する。
// TNR実施数は、cats/tnr_schedulesに地域情報がないため全国合計のみ表示する。
export default function Stats() {
  const [rows, setRows] = useState([])
  const [tnrDone, setTnrDone] = useState(null)
  const [catsTotal, setCatsTotal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTable, setShowTable] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: regionData }, tnrCount, catsCount] = await Promise.all([
        supabase.rpc("get_region_stats"),
        supabase.from("tnr_schedules").select("id", { count: "exact", head: true }).eq("done", true),
        supabase.from("cats").select("id", { count: "exact", head: true }),
      ])
      setRows((regionData || []).map((r) => ({
        ...r,
        total: r.reports_total + r.adoptions_total + r.volunteer_total + r.posts_total,
      })))
      setTnrDone(tnrCount.count ?? 0)
      setCatsTotal(catsCount.count ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div style={{ maxWidth: 640, margin: "40px auto", padding: 24 }}>読み込み中...</div>
  }

  const withPosts = rows.filter((r) => r.prefecture !== "未設定" && r.total > 0)
  const sorted = [...withPosts].sort((a, b) => b.total - a.total)
  const top = sorted.slice(0, 12)
  const maxTotal = top.length > 0 ? top[0].total : 1
  const unset = rows.find((r) => r.prefecture === "未設定")
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0)

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<BarChart3 size={20} color="#e07a5f" />} title="地域別 活動統計" />
      <p style={{ color: "#9e7b6e", marginBottom: 20, fontSize: 13, lineHeight: 1.6 }}>
        NekoMap全体の活動を都道府県別に集計したものです（個人情報は含みません）。TNR実施数は現在、地域別データを持っていないため全国合計のみ表示しています。
      </p>

      <div style={statTileRow}>
        <StatTile label={<><Scissors size={12} /> TNR完了数（全国）</>} value={tnrDone} />
        <StatTile label={<><Cat size={12} /> 登録猫数（全国）</>} value={catsTotal} />
        <StatTile label={<><Tag size={12} /> 地域タグ付き投稿数</>} value={grandTotal - (unset?.total || 0)} />
      </div>

      <h3 style={sectionTitle}>都道府県別 総投稿数（上位{top.length}件）</h3>
      {top.length === 0 ? (
        <p style={{ color: "#999", textAlign: "center" }}>まだ都道府県が設定された投稿がありません</p>
      ) : (
        <div role="img" aria-label="都道府県別の総投稿数を示す横棒グラフ">
          {top.map((r) => (
            <BarRow key={r.prefecture} label={r.prefecture} value={r.total} max={maxTotal} />
          ))}
        </div>
      )}
      {unset && unset.total > 0 && (
        <p style={{ fontSize: 12, color: "#bbb", marginTop: 8 }}>
          ※ 都道府県が未設定の投稿が{unset.total}件あります（絞り込み対象外として、地域を問わず一覧には表示されています）
        </p>
      )}

      <button onClick={() => setShowTable(!showTable)} style={toggleTableBtn}>
        {showTable ? "▲ 詳細テーブルを閉じる" : "▼ 都道府県別の詳細データを見る（テーブル表示）"}
      </button>

      {showTable && (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left" }}>都道府県</th>
                <th style={thStyle}>困りごと</th>
                <th style={thStyle}>解決済み</th>
                <th style={thStyle}>里親募集</th>
                <th style={thStyle}>成立済み</th>
                <th style={thStyle}>ボランティア</th>
                <th style={thStyle}>掲示板</th>
                <th style={thStyle}>合計</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.prefecture}>
                  <td style={{ ...tdStyle, textAlign: "left" }}>{r.prefecture}</td>
                  <td style={tdStyle}>{r.reports_total}</td>
                  <td style={tdStyle}>{r.reports_resolved}</td>
                  <td style={tdStyle}>{r.adoptions_total}</td>
                  <td style={tdStyle}>{r.adoptions_matched}</td>
                  <td style={tdStyle}>{r.volunteer_total}</td>
                  <td style={tdStyle}>{r.posts_total}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{r.total}</td>
                </tr>
              ))}
              {unset && (
                <tr>
                  <td style={{ ...tdStyle, textAlign: "left" }}>（未設定）</td>
                  <td style={tdStyle}>{unset.reports_total}</td>
                  <td style={tdStyle}>{unset.reports_resolved}</td>
                  <td style={tdStyle}>{unset.adoptions_total}</td>
                  <td style={tdStyle}>{unset.adoptions_matched}</td>
                  <td style={tdStyle}>{unset.volunteer_total}</td>
                  <td style={tdStyle}>{unset.posts_total}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{unset.total}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatTile({ label, value }) {
  return (
    <div style={tileStyle}>
      <p style={{ margin: 0, fontSize: 12, color: "#9e7b6e", display: "flex", alignItems: "center", gap: 4 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 700, color: "#3d3230" }}>
        {value === null ? "-" : value.toLocaleString()}
      </p>
    </div>
  )
}

// 横棒グラフの1行。バーは単色（セマンティックな配色: 「量」を表す単一色調の
// 明度グラデーション）で塗り、ラベル・数値は必ずバーの外（白背景の上）に
// 濃い文字色で表示することで、コントラスト不足を避けている。
function BarRow({ label, value, max }) {
  const pct = Math.max(4, Math.round((value / max) * 100))
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span style={{ width: 76, fontSize: 12, color: "#3d3230", flexShrink: 0, textAlign: "right" }}>{label}</span>
      <div style={{ flex: 1, background: "#f5ede7", borderRadius: 6, height: 16, position: "relative" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 6, background: "#e07a5f" }} />
      </div>
      <span style={{ width: 40, fontSize: 12, color: "#3d3230", fontWeight: 600, flexShrink: 0 }}>{value}</span>
    </div>
  )
}

const statTileRow = { display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }
const tileStyle = {
  flex: "1 1 140px", padding: "14px 16px",
  background: "#fff9f5", border: "1px solid #f2c4a0", borderRadius: 14,
}
const sectionTitle = { margin: "0 0 12px", color: "#e07a5f", fontSize: 15 }
const toggleTableBtn = {
  display: "block", width: "100%", marginTop: 20, padding: "10px",
  background: "#f0e6e0", color: "#e07a5f", border: "none",
  borderRadius: 10, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
}
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 560 }
const thStyle = {
  textAlign: "right", padding: "8px 6px", borderBottom: "2px solid #f2c4a0",
  color: "#9e7b6e", whiteSpace: "nowrap",
}
const tdStyle = { textAlign: "right", padding: "6px 6px", borderBottom: "1px solid #f5ede7", whiteSpace: "nowrap" }
