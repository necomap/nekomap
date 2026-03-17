import { MapContainer, TileLayer } from "react-leaflet";

export default function Map() {
  return (
    <MapContainer
      center={[35.681,139.767]}
      zoom={13}
      style={{height:"100vh"}}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  )
}