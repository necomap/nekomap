// lib/geocode.js
//
// 住所・ランドマーク名から候補地を検索するユーティリティ。
// 無料のOpenStreetMap Nominatim APIを使用（追加費用・APIキー不要）。
//
// あいまい検索のため似た名前の別の場所がヒットすることがある
// （例：「高辻公園」→「高石公園」）。そのため候補を複数件返し、
// 呼び出し側でユーザーに選ばせてから地図に反映する形にしている。
//
// ★注意★ Nominatimの利用ポリシー上、連続で大量にリクエストするのは
// 禁止されている。そのため、この関数は「検索ボタンを押した時」など
// ユーザーの明示的な操作の時だけ呼び出すこと（入力の度に自動検索する
// ような使い方はしないこと）。
export async function searchAddressCandidates(query, limit = 5) {
  if (!query || !query.trim()) return []

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&countrycodes=jp&q=${encodeURIComponent(query)}`,
    { headers: { "Accept-Language": "ja" } }
  )
  if (!res.ok) throw new Error("検索に失敗しました")

  const results = await res.json()
  return results.map((r) => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    displayName: r.display_name,
  }))
}
