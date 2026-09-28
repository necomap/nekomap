import { MapPin } from "lucide-react"
import { REGIONS } from "../lib/prefectures"

// 一覧ページ上部に置く「表示地域」セレクター。
// region: "" = 全国表示中, "東京都"等 = その都道府県に絞り込み中
export default function RegionSelector({ region, onChange }) {
  return (
    <div style={wrapStyle}>
      <MapPin size={14} color="#9e7b6e" />
      <span style={labelStyle}>表示地域:</span>
      <select
        value={region}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyle}
      >
        <option value="">🌏 全国</option>
        {REGIONS.map((r) => (
          <optgroup key={r.region} label={r.region}>
            {r.prefectures.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

const wrapStyle = {
  display: "flex", alignItems: "center", gap: 6,
  marginBottom: 16, padding: "8px 12px",
  background: "#fff9f5", border: "1px solid #f2c4a0",
  borderRadius: 10, fontSize: 13,
}
const labelStyle = { color: "#9e7b6e", whiteSpace: "nowrap" }
const selectStyle = {
  flex: 1, border: "none", background: "transparent",
  fontFamily: "inherit", fontSize: 13, color: "#3d3230",
  cursor: "pointer",
}
