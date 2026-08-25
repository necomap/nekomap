import { useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import { getImageEmbedding, embeddingToVectorLiteral } from "../lib/catFaceAI"

// 選択された写真から「似ている登録済みの猫」をAIで検索して提示するコンポーネント。
// 目撃情報・野良猫報告の投稿フォームなどで、猫を手動で探す手間を減らすために使う。
//
// props:
//   photo:         File（選択された写真。nullなら何も表示しない）
//   onSelect:      (cat) => void  候補をクリックしたときに呼ばれる
//   selectedCatId: 現在選択中の猫ID（候補ボタンのハイライト用。任意）
export default function CatMatchSuggestions({ photo, onSelect, selectedCatId }) {
  const [status, setStatus] = useState("idle") // idle | loading | done | error
  const [matches, setMatches] = useState([])
  const runIdRef = useRef(0)

  useEffect(() => {
    if (!photo) {
      setStatus("idle")
      setMatches([])
      return
    }

    const runId = ++runIdRef.current
    setStatus("loading")

    async function run() {
      try {
        const embedding = await getImageEmbedding(photo)
        if (runId !== runIdRef.current) return

        const { data, error } = await supabase.rpc("match_cat_by_embedding", {
          query_embedding: embeddingToVectorLiteral(embedding),
          match_count: 4,
          match_threshold: 0.4,
        })

        if (runId !== runIdRef.current) return
        if (error) {
          console.log("AI検索エラー:", error.message)
          setStatus("error")
          return
        }
        setMatches(data || [])
        setStatus("done")
      } catch (e) {
        console.log("AI検索エラー:", e.message)
        if (runId === runIdRef.current) setStatus("error")
      }
    }
    run()
  }, [photo])

  if (status === "idle") return null

  return (
    <div style={boxStyle}>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#9e7b6e" }}>
        🔍 AIが似ている登録済みの猫を探しています（参考情報です。最終確認は目視でお願いします）
      </p>

      {status === "loading" && <p style={mutedText}>解析中...</p>}
      {status === "error" && <p style={mutedText}>AI解析に失敗しました。お手数ですが手動で選択してください</p>}
      {status === "done" && matches.length === 0 && (
        <p style={mutedText}>似ている猫は見つかりませんでした</p>
      )}

      {status === "done" && matches.length > 0 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              style={{
                ...candidateStyle,
                background: selectedCatId === m.id ? "#f0e6ff" : "white",
                borderColor: selectedCatId === m.id ? "#7b61ff" : "#f2c4a0",
              }}
            >
              {m.photo ? (
                <img src={m.photo} alt={m.name} style={thumbStyle} />
              ) : (
                <div style={{ ...thumbStyle, background: "#f0e6e0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                  🐱
                </div>
              )}
              <span style={nameStyle}>{m.name}</span>
              <span style={{ fontSize: 10, color: "#9e7b6e" }}>{Math.round(m.similarity * 100)}%</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const boxStyle = {
  marginBottom: 16, padding: 12, background: "#fff9f5",
  borderRadius: 12, border: "1px solid #f2c4a0",
}
const mutedText = { fontSize: 13, color: "#bbb", margin: 0 }
const candidateStyle = {
  display: "flex", flexDirection: "column", alignItems: "center",
  width: 84, flexShrink: 0, padding: 6, borderRadius: 10, cursor: "pointer",
  fontFamily: "inherit", border: "2px solid #f2c4a0",
}
const thumbStyle = { width: 60, height: 60, objectFit: "cover", borderRadius: "50%" }
const nameStyle = {
  fontSize: 12, marginTop: 4, color: "#3d3230", whiteSpace: "nowrap",
  overflow: "hidden", textOverflow: "ellipsis", maxWidth: 76,
}
