import { useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"

export default function CatMap({ sightings, territory }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current) return
    if (mapInstanceRef.current) return

    const L = require("leaflet")
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    })

    const map = L.map(mapRef.current)
    mapInstanceRef.current = map
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map)

    const bounds = []

    sightings?.forEach((s) => {
      if (!s.lat || !s.lng) return
      const marker = L.circleMarker([s.lat, s.lng], {
        radius: 8, color: "#e07a5f", fillColor: "#e07a5f", fillOpacity: 0.7,
      })
      marker.bindPopup(`📍 ${new Date(s.created_at).toLocaleDateString("ja-JP")}<br/>${s.description || ""}`)
      marker.addTo(map)
      bounds.push([s.lat, s.lng])
    })

    if (territory) {
      const layer = L.geoJSON(territory.polygon, {
        style: { color: "#e07a5f", fillOpacity: 0.25, weight: 2 },
      }).addTo(map)
      const tb = layer.getBounds()
      bounds.push([tb.getNorth(), tb.getEast()])
      bounds.push([tb.getSouth(), tb.getWest()])
    }

    setTimeout(() => {
      map.invalidateSize()
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [20, 20] })
      } else {
        map.setView([35.681, 139.767], 13)
      }
    }, 300)

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%", height: 240, borderRadius: 12,
        marginBottom: 12, border: "1px solid #f2c4a0",
        position: "relative", zIndex: 0,
      }}
    />
  )
}