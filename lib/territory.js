import * as turf from "@turf/turf"

export function createTerritory(points) {

const turfPoints = points.map(p =>
  turf.point([p.lng, p.lat])
)

const featureCollection =
turf.featureCollection(turfPoints)

const hull = turf.convex(featureCollection)

return hull

}