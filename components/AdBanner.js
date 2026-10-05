import { useEffect, useState } from "react"
import AmazonPicks from "./AmazonPicks"

// AdSense承認が下りたら true にすると、下の実広告表示に切り替わる。
// それまではAmazonアソシエイトのテキスト広告（AmazonPicks）をこの枠に表示する。
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

  return <AmazonPicks />
}
