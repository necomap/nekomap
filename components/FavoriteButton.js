import { useState } from "react"
import { Star } from "lucide-react"
import { toggleFavorite } from "../lib/favorites"

// 一覧・詳細カードに置く⭐お気に入りボタン。
// 未ログインの場合は表示しない想定（呼び出し側でuserの有無をチェックしてから使う）。
export default function FavoriteButton({ userId, targetTable, targetId, favorited, onChange, size = 18 }) {
  const [loading, setLoading] = useState(false)

  async function handleClick(e) {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const next = await toggleFavorite(userId, targetTable, targetId, favorited)
      onChange?.(next)
    } catch (err) {
      alert("お気に入りの更新に失敗しました: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title={favorited ? "お気に入りから外す" : "お気に入りに追加"}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: size + 16, height: size + 16, padding: 0,
        border: "none", borderRadius: "50%", cursor: "pointer",
        background: favorited ? "#fff4e0" : "#f0e6e0",
        flexShrink: 0,
      }}
    >
      <Star size={size} color={favorited ? "#f5a623" : "#bbb"} fill={favorited ? "#f5a623" : "none"} />
    </button>
  )
}
