import * as turf from "@turf/turf"

function generateTerritory(points){

const features = points.map(p =>
turf.point([p.lng,p.lat])
)

const fc = turf.featureCollection(features)

const hull = turf.convex(fc)

return hull

}