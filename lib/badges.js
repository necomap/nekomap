// 貢献度スコア・バッジ判定の共通ロジック
// ranking/index.js と profile/edit.js から使用する

export const POINTS = {
  tnr: 5,          // TNR達成 1件あたり
  sighting: 1,      // 目撃情報投稿 1件あたり
  post: 1,          // 掲示板投稿 1件あたり
  rescue: 3,        // 保護報告（掲示板カテゴリ=rescue） 1件あたり
  resolved: 3,      // 困りごと解決 1件あたり
  volunteerApp: 2,  // ボランティア応募 1件あたり
}

export const BADGE_TIERS = [
  { min: 100, emoji: "👑", label: "レジェンドサポーター" },
  { min: 50, emoji: "💎", label: "エキスパートサポーター" },
  { min: 20, emoji: "⭐", label: "ベテランサポーター" },
  { min: 5, emoji: "🐾", label: "レギュラーサポーター" },
  { min: 0, emoji: "🌱", label: "新米サポーター" },
]

export function getBadge(score) {
  return BADGE_TIERS.find((t) => score >= t.min) || BADGE_TIERS[BADGE_TIERS.length - 1]
}

// 期間フィルターの起点日を返す（"all" は null = 絞り込みなし）
export function getPeriodCutoff(period) {
  const now = new Date()
  if (period === "week") {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d.toISOString()
  }
  if (period === "month") {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 1)
    return d.toISOString()
  }
  return null
}
