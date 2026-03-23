import { useEffect } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"
import { supabase } from "../lib/supabase"

function createIcon(emoji, color) {
  return (L) => L.divIcon({
    html: `<div style="
      background:${color};
      width:36px;height:36px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,0.2);
      border:2px solid white;
    "><span style="transform:rotate(45deg);font-size:16px">${emoji}</span></div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

function MapLayers() {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    const L = require("leaflet")
    require("leaflet-draw")

    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    })

    // 地域猫ピン（ぼかし処理付き）
    async function loadCatSightings() {
      const { data: userData } = await supabase.auth.getUser()
      let userType = "general"
      if (userData.user) {
        const { data: profile } = await supabase
          .from("users").select("role, account_type")
          .eq("id", userData.user.id).single()
        userType = profile?.role === "admin" ? "admin" : profile?.account_type || "general"
      }

      const { data, error } = await supabase
        .from("sightings")
        .select("*, cats(name)")

      console.log("sightingsデータ:", data)
      console.log("エラー:", error)

      if (!data) return
      const icon = createIcon("🐱", "#e07a5f")(L)
      data.forEach((s) => {
        if (!s.lat || !s.lng) return
        L.marker([s.lat, s.lng], { icon })
          .bindPopup(`
            <b>🐱 ${s.cats?.name || "地域猫"}</b><br/>
            ${s.description || ""}<br/>
            ${s.photo ? `<img src="${s.photo}" style="width:100%;margin-top:8px;border-radius:4px"/>` : ""}
            ${s.cat_id ? `<br/><a href="/cats/${s.cat_id}" style="color:#e07a5f;font-size:13px">🐱 猫の詳細を見る →</a>` : ""}
            ${userType === "general" ? "<br/><small style='color:#999'>※位置は約100mぼかしています</small>" : ""}
          `)
          .addTo(map)
      })
    }

    // 野良猫ピン（グレー）
    async function loadStrayReports() {
      const { data } = await supabase
        .from("stray_reports")
        .select("*")
      if (!data) return
      const icon = createIcon("🐈", "#888")(L)
      data.forEach((s) => {
        if (!s.lat || !s.lng) return
        L.marker([s.lat, s.lng], { icon })
          .bindPopup(`
            <b>🐈 野良猫目撃</b><br/>
            ${s.features || ""}<br/>
            ${s.comment || ""}<br/>
            ${s.photo ? `<img src="${s.photo}" style="width:100%;margin-top:8px;border-radius:4px"/>` : ""}
          `)
          .addTo(map)
      })
    }

    // 困りごとピン（赤系）
    async function loadTroubles() {
      const { data } = await supabase.from("trouble_reports").select("*")
      if (!data) return
      const icons = {
        feces: { emoji: "💩", color: "#8B4513" },
        fight: { emoji: "🐾", color: "#e74c3c" },
        injury: { emoji: "🩹", color: "#e91e63" },
        other: { emoji: "❓", color: "#9b59b6" },
      }
      data.forEach((t) => {
        if (!t.lat || !t.lng) return
        const { emoji, color } = icons[t.type] || icons.other
        const icon = createIcon(emoji, color)(L)
        L.marker([t.lat, t.lng], { icon })
          .bindPopup(`
            <b>${emoji} ${t.type}</b><br/>
            ${t.description || ""}<br/>
            <span style="color:${t.status === "対応済" ? "green" : "orange"}">${t.status}</span>
            ${t.action ? `<br/>対策: ${t.action}` : ""}
          `)
          .addTo(map)
      })
    }

    // トイレ・ハウス・フードピン（緑系）
    async function loadCatSpots() {
      const { data } = await supabase.from("cat_spots").select("*")
      if (!data) return
      const icons = {
        toilet: { emoji: "🚽", color: "#27ae60" },
        house: { emoji: "🏠", color: "#2ecc71" },
        food: { emoji: "🍚", color: "#f39c12" },
      }
      data.forEach((s) => {
        if (!s.lat || !s.lng) return
        const { emoji, color } = icons[s.type] || { emoji: "📍", color: "#27ae60" }
        const icon = createIcon(emoji, color)(L)
        L.marker([s.lat, s.lng], { icon })
          .bindPopup(`
            <b>${emoji} ${s.type}</b><br/>
            ${s.description || ""}
            ${s.verified ? "<br/>✅ 確認済み" : ""}
          `)
          .addTo(map)
      })
    }

    // ナワバリ表示
    async function loadTerritories() {
      const { data } = await supabase.from("territories").select("*")
      if (!data) return
      data.forEach((territory) => {
        L.geoJSON(territory.polygon, {
          style: {
            color: territory.color || "#e07a5f",
            fillOpacity: 0.25,
            weight: 2,
          },
        }).addTo(map)
      })
    }

    // ナワバリ描画コントロール
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)
    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems },
      draw: {
        polygon: true, rectangle: false,
        circle: false, circlemarker: false,
        marker: false, polyline: false,
      },
    })
    map.addControl(drawControl)

    map.on(L.Draw.Event.CREATED, async function (e) {
      const layer = e.layer
      drawnItems.addLayer(layer)
      const geojson = layer.toGeoJSON()

      const { data: cats } = await supabase.from("cats").select("id, name")

      const catList = cats?.map((c) => c.name).join("、") || "なし"
      const input = prompt(
        `ナワバリを保存します。\n猫と紐付ける場合は猫の名前を入力してください（任意）\n空白のままOKで猫なしで保存できます。\n\n登録済みの猫:\n${catList}`
      )

      // キャンセルした場合は保存しない
      if (input === null) {
        drawnItems.removeLayer(layer)
        return
      }

      let catId = null
      let catName = null
      if (input.trim() && cats) {
        const found = cats.find((c) => c.name === input.trim())
        if (found) {
          catId = found.id
          catName = found.name
        } else {
          // 未登録の猫の場合
          const goRegister = confirm(
            `「${input}」は登録されていません。\n\n猫を登録してからナワバリを紐付けますか？\nOK→猫登録画面へ / キャンセル→猫なしで保存`
          )
          if (goRegister) {
            // ナワバリを一時保存してから猫登録画面へ
            const { data: saved } = await supabase.from("territories").insert({
              polygon: geojson,
              color: "#4a90e2",
              cat_id: null,
            }).select().single()

            if (saved) {
              L.geoJSON(geojson, {
                style: { color: "#4a90e2", fillOpacity: 0.25, weight: 2 },
              }).addTo(map)
              alert("ナワバリを保存しました。猫登録後に管理画面から紐付けできます。")
              window.location.href = "/cats/new"
            }
            return
          }
        }
      }

      const { error } = await supabase.from("territories").insert({
        polygon: geojson,
        color: catId ? "#e07a5f" : "#4a90e2",
        cat_id: catId,
      })

      if (!error) {
        L.geoJSON(geojson, {
          style: {
            color: catId ? "#e07a5f" : "#4a90e2",
            fillOpacity: 0.25, weight: 2,
          },
        }).addTo(map)
        if (catId) alert(`${catName}のナワバリとして保存しました！`)
        else alert("ナワバリを保存しました！")
      }
    })

    loadTerritories()
    loadCatSightings()
    loadStrayReports()
    loadTroubles()
    loadCatSpots()

    return () => { map.removeControl(drawControl) }
  }, [map])

  return null
}

export default function MapView() {
  return (
    <MapContainer
      center={[35.681, 139.767]}
      zoom={13}
      style={{ height: "calc(100vh - 56px)" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapLayers />
    </MapContainer>
  )
}