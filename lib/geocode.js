// lib/geocode.js
//
// 住所・ランドマーク名から緯度経度を検索するユーティリティ。
// 無料のOpenStreetMap Nominatim APIを使用（追加費用・APIキー不要）。
//
// ★注意★ Nominatimの利用ポリシー上、連続で大量にリクエストするのは
// 禁止されている。そのため、この関数は「検索ボタンを押した時」など
// ユーザーの明示的な操作の時だけ呼び出すこと（入力の度に自動検索する
// ような使い方はしないこと）。
export async function geocodeAddress(query) {
  if (!query || !query.trim()) return null

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=jp&q=${encodeURIComponent(query)}`,
    { headers: { "Accept-Language": "ja" } }
  )
  if (!res.ok) throw new Error("検索に失敗しました")

  const results = await res.json()
  if (!results.length) return null

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  }
}
