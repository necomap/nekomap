export function blurLocation(lat, lng) {

const offset = Math.random() * 0.002 - 0.001

return {
  lat: lat + offset,
  lng: lng + offset
}

}