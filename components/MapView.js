import { useEffect } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"
import { supabase } from "../lib/supabase"

function MapLayers() {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    const L = require("leaflet")
    require("leaflet-draw")

  // ピン追加
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  })

    // ナワバリ表示
    async function loadTerritories() {
      const { data } = await supabase.from("territories").select("*")
      if (!data) return
      data.forEach((territory) => {
        L.geoJSON(territory.polygon, {
          style: {
            color: territory.color || "#ff7800",
            fillOpacity: 0.3,
            weight: 2,
          },
        }).addTo(map)
      })
    }

    // 目撃情報ピン表示
    async function loadSightings() {
    const { data, error } = await supabase
      .from("sightings")
      .select("*")
  
    console.log("目撃データ:", data)
    console.log("エラー:", error)
  
    if (!data) return
    data.forEach((s) => {
      if (!s.lat || !s.lng) return
      const marker = L.marker([s.lat, s.lng])
      marker.bindPopup(`
        <b>目撃情報</b><br/>
        ${s.description || ""}<br/>
        ${s.photo ? `<img src="${s.photo}" style="width:100%;margin-top:8px;border-radius:4px"/>` : ""}
      `)
      marker.addTo(map)
    })
  }
    // ナワバリ描画コントロール
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems },
      draw: {
        polygon: true,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
      },
    })
    map.addControl(drawControl)

    map.on(L.Draw.Event.CREATED, async function (e) {
      const layer = e.layer
      drawnItems.addLayer(layer)
      const geojson = layer.toGeoJSON()

      const { error } = await supabase.from("territories").insert({
        polygon: geojson,
        color: "#ff7800",
      })

      if (!error) {
        L.geoJSON(geojson, {
          style: { color: "#ff7800", fillOpacity: 0.3, weight: 2 },
        }).addTo(map)
      }
    })

    loadTerritories()
    loadSightings()

    return () => {
      map.removeControl(drawControl)
    }
  }, [map])

  return null
}

export default function MapView() {
  return (
    <MapContainer
      center={[35.681, 139.767]}
      zoom={13}
      style={{ height: "100vh" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapLayers />
    </MapContainer>
  )
}