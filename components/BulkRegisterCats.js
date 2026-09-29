import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

const EMPTY_ROW = { name: "", sex: "", neutered: false, features: "", notes: "" }

export default function BulkRegisterCats() {
  const [targets, setTargets] = useState([])
  const [targetUserId, setTargetUserId] = useState("")
  const [mode, setMode] = useState("form") // form | csv
  const [rows, setRows] = useState([{ ...EMPTY_ROW }])
  const [csvText, setCsvText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function loadTargets() {
      const { data } = await supabase
        .from("users")
        .select("id, nickname, organization, account_type")
        .in("account_type", ["organization", "activist"])
        .order("organization", { ascending: true })
      setTargets(data || [])
    }
    loadTargets()
  }, [])

  function updateRow(i, field, value) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }])
  }

  function removeRow(i) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  // CSV: 1行目はヘッダーとして無視し、「名前,性別,去勢(1/0),特徴,注意事項」の順で読む
  function parseCsv(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
    if (lines.length === 0) return []
    const looksLikeHeader = /名前|name/i.test(lines[0])
    const dataLines = looksLikeHeader ? lines.slice(1) : lines
    return dataLines.map((line) => {
      const cols = line.split(",").map((c) => c.trim())
      return {
        name: cols[0] || "",
        sex: cols[1] || "",
        neutered: ["1", "true", "済", "済み", "はい"].includes((cols[2] || "").toLowerCase()),
        features: cols[3] || "",
        notes: cols[4] || "",
      }
    })
  }

  async function handleSubmit() {
    setError("")
    setMessage("")
    if (!targetUserId) {
      setError("登録先の団体・活動者アカウントを選択してください")
      return
    }
    const catsToSend = mode === "csv" ? parseCsv(csvText) : rows
    const validCount = catsToSend.filter((c) => (c.name || "").trim()).length
    if (validCount === 0) {
      setError("名前が入力された猫が1頭もありません")
      return
    }

    setLoading(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token
    if (!accessToken) {
      setError("ログイン状態を確認できませんでした。再度ログインしてください")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/admin/bulk-register-cats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ targetUserId, cats: catsToSend }),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || "登録に失敗しました")
        setLoading(false)
        return
      }
      setMessage(`${result.inserted}頭を登録しました！（スキップ: ${result.skipped}件）`)
      setRows([{ ...EMPTY_ROW }])
      setCsvText("")
    } catch (e) {
      setError("通信エラーが発生しました: " + e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 620, padding: 16 }}>
      <h2 style={{ marginBottom: 8, color: "#e07a5f" }}>猫の代行一括登録</h2>
      <p style={{ fontSize: 13, color: "#9e7b6e", marginBottom: 16 }}>
        何十頭も猫を抱えている団体さんに代わって、管理者がまとめて猫を登録できます。
        登録した猫は、選択したアカウントが登録したものとして扱われます
        （写真・AI顔認識は登録後に各自で追加できます）。
      </p>

      <label style={labelStyle}>登録先アカウント（必須）</label>
      <select
        value={targetUserId}
        onChange={(e) => setTargetUserId(e.target.value)}
        style={inputStyle}
      >
        <option value="">選択してください</option>
        {targets.map((t) => (
          <option key={t.id} value={t.id}>
            {t.organization || t.nickname}
            {t.organization ? `（${t.nickname}）` : ""}
          </option>
        ))}
      </select>
      {targets.length === 0 && (
        <p style={{ fontSize: 12, color: "#bbb", marginTop: -8, marginBottom: 12 }}>
          団体・活動者アカウントがまだありません。先にユーザータブで種別を変更するか、代行登録してください。
        </p>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <button
          onClick={() => setMode("form")}
          style={mode === "form" ? tabBtnActive : tabBtn}
        >
          フォーム入力
        </button>
        <button
          onClick={() => setMode("csv")}
          style={mode === "csv" ? tabBtnActive : tabBtn}
        >
          CSV貼り付け
        </button>
      </div>

      {mode === "form" && (
        <div style={{ marginBottom: 16 }}>
          {rows.map((row, i) => (
            <div key={i} style={rowCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#9e7b6e" }}>{i + 1}頭目</span>
                {rows.length > 1 && (
                  <button onClick={() => removeRow(i)} style={removeBtnStyle}>削除</button>
                )}
              </div>
              <input
                placeholder="猫の名前（必須）"
                value={row.name}
                onChange={(e) => updateRow(i, "name", e.target.value)}
                style={inputStyle}
              />
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <select
                  value={row.sex}
                  onChange={(e) => updateRow(i, "sex", e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                >
                  <option value="">性別</option>
                  <option value="オス">オス</option>
                  <option value="メス">メス</option>
                  <option value="不明">不明</option>
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={row.neutered}
                    onChange={(e) => updateRow(i, "neutered", e.target.checked)}
                  />
                  手術済み
                </label>
              </div>
              <input
                placeholder="特徴（毛色・模様など）"
                value={row.features}
                onChange={(e) => updateRow(i, "features", e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="注意事項（任意）"
                value={row.notes}
                onChange={(e) => updateRow(i, "notes", e.target.value)}
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            </div>
          ))}
          <button onClick={addRow} style={addRowBtnStyle}>＋ 1頭追加</button>
        </div>
      )}

      {mode === "csv" && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: "#9e7b6e", marginBottom: 8, lineHeight: 1.6 }}>
            1行1頭、カンマ区切りで貼り付けてください。<br />
            列の順番：名前, 性別, 去勢済みなら1（任意）, 特徴（任意）, 注意事項（任意）<br />
            1行目はヘッダーとして自動で無視されます（「名前」で始まる場合）。
          </p>
          <textarea
            placeholder={"名前,性別,去勢,特徴,注意事項\nたま,メス,1,茶トラ,人懐っこい\nミケ,オス,0,,"}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            style={{ ...inputStyle, height: 160, fontFamily: "monospace", fontSize: 13 }}
          />
          {csvText.trim() && (
            <p style={{ fontSize: 12, color: "#9e7b6e" }}>
              {parseCsv(csvText).filter((c) => c.name).length}頭を読み取りました
            </p>
          )}
        </div>
      )}

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}
      {message && <p style={{ color: "#43a047", marginBottom: 12 }}>{message}</p>}

      <button onClick={handleSubmit} disabled={loading} style={buttonStyle}>
        {loading ? "登録中..." : "一括登録する"}
      </button>
    </div>
  )
}

const labelStyle = {
  display: "block", fontSize: 13, color: "#9e7b6e", marginBottom: 4,
}
const inputStyle = {
  display: "block", width: "100%", padding: "10px 12px",
  marginBottom: 12, border: "1px solid #f2c4a0", borderRadius: 12,
  fontSize: 15, boxSizing: "border-box", fontFamily: "inherit",
}
const buttonStyle = {
  display: "block", width: "100%", padding: "12px",
  background: "#e07a5f", color: "white", border: "none",
  borderRadius: 12, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
}
const tabBtn = {
  padding: "8px 16px", borderRadius: 20, border: "none",
  cursor: "pointer", fontFamily: "inherit", fontSize: 13,
  background: "#f0e6e0", color: "#3d3230",
}
const tabBtnActive = {
  ...tabBtn, background: "#e07a5f", color: "white",
}
const rowCardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 12,
  padding: 12, marginBottom: 10, background: "#fff9f5",
}
const removeBtnStyle = {
  padding: "3px 10px", background: "#ffebee", color: "#c62828",
  border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer",
  fontFamily: "inherit",
}
const addRowBtnStyle = {
  display: "block", width: "100%", padding: "10px",
  background: "#f0e6e0", color: "#e07a5f", border: "none",
  borderRadius: 12, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
}
