import { useEffect, useState } from "react"

export default function AdBanner({ slot = "auto" }) {
  const [adLoaded, setAdLoaded] = useState(false)

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
      setAdLoaded(true)
    } catch (e) {}
  }, [])

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