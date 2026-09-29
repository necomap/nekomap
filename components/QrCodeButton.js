import { useState } from "react"
import { QrCode, X, Download } from "lucide-react"

// ポスター等に貼るQRコードを表示するボタン。
// クリックすると、指定URL（省略時は現在のページURL）のQRコードを
// その場で生成してモーダル表示する（qrcodeパッケージ使用、外部通信なし）。
export default function QrCodeButton({ url, label = "QRコードを表示" }) {
  const [open, setOpen] = useState(false)
  const [dataUrl, setDataUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleOpen(e) {
    e?.stopPropagation()
    setOpen(true)
    if (dataUrl) return
    setLoading(true)
    setError("")
    try {
      const QRCode = (await import("qrcode")).default
      const targetUrl = url || (typeof window !== "undefined" ? window.location.href : "")
      const png = await QRCode.toDataURL(targetUrl, { width: 320, margin: 2 })
      setDataUrl(png)
    } catch (e2) {
      setError("QRコードの生成に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" onClick={handleOpen} style={btnStyle}>
        <QrCode size={14} style={{ marginRight: 4 }} />
        {label}
      </button>

      {open && (
        <div style={overlayStyle} onClick={() => setOpen(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} style={closeBtnStyle}>
              <X size={18} />
            </button>
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "#9e7b6e", textAlign: "center" }}>
              このページのQRコード
            </p>
            {loading && <p style={{ textAlign: "center", color: "#999" }}>生成中...</p>}
            {error && <p style={{ textAlign: "center", color: "red", fontSize: 13 }}>{error}</p>}
            {dataUrl && (
              <>
                <img src={dataUrl} alt="QRコード" style={{ width: "100%", maxWidth: 260, display: "block", margin: "0 auto" }} />
                <a
                  href={dataUrl}
                  download="nekomap-qrcode.png"
                  style={downloadBtnStyle}
                >
                  <Download size={14} style={{ marginRight: 4 }} />
                  画像をダウンロード
                </a>
                <p style={{ margin: "12px 0 0", fontSize: 11, color: "#bbb", textAlign: "center" }}>
                  ポスターやチラシに貼ると、スマホで読み取ってこのページに直接アクセスできます
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const btnStyle = {
  padding: "6px 12px", background: "#f0e6e0", color: "#e07a5f",
  border: "none", borderRadius: 20, fontSize: 12, cursor: "pointer",
  fontFamily: "inherit", display: "inline-flex", alignItems: "center",
}
const overlayStyle = {
  position: "fixed", inset: 0, zIndex: 2000,
  background: "rgba(0,0,0,0.4)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 24,
}
const modalStyle = {
  position: "relative", background: "white", borderRadius: 16,
  padding: 24, maxWidth: 320, width: "100%",
}
const closeBtnStyle = {
  position: "absolute", top: 8, right: 8, padding: 6,
  background: "none", border: "none", cursor: "pointer", color: "#999",
}
const downloadBtnStyle = {
  display: "flex", alignItems: "center", justifyContent: "center",
  marginTop: 16, padding: "10px", background: "#e07a5f", color: "white",
  borderRadius: 10, fontSize: 13, textDecoration: "none", fontFamily: "inherit",
}
