import dynamic from "next/dynamic"

const Map = dynamic(() => import("../components/MapView"), { ssr: false })

export default function MapPage() {
  return <Map />
}