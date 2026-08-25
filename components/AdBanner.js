import { useEffect, useState } from "react"

// AdSense承認が下りたら true にすると、下の実広告表示に切り替わる。
// それまでは「スポンサー募集中」の案内をこの枠に表示する。
const USE_ADSENSE = false

export default function AdBanner({ slot = "auto" }) {
  const [adLoaded, setAdLoaded] = useState(false)

  useEffect(() => {
    if (!USE_ADSENSE) return
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
      setAdLoaded(true)
    } catch (e) {}
  }, [])

  if (USE_ADSENSE) {
    // AdSense審査中・未承認の場合は何も表示しない
    if (!adLoaded) return null

    return (
      <div style={{ margin: "8px 0", overflow: "hidden" }}>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-2277926623752174"
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    )
  }

  return (
    <a
      href="/contact"
      style={{
        display: "block", margin: "8px 0", padding: "14px 16px",
        background: "#fff9f5", border: "1px dashed #f2c4a0", borderRadius: 12,
        textAlign: "center", textDecoration: "none",
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: "#e07a5f", fontWeight: 600 }}>
        📢 スポンサー募集中
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9e7b6e" }}>
        この場所に広告を掲載しませんか？お問い合わせはこちら
      </p>
    </a>
  )
}