import L from "leaflet"
import "leaflet-draw"

const map = L.map("map").setView([35.68,139.76],13)

new L.Control.Draw({
draw:{
polygon:true,
rectangle:false,
circle:false
}
}).addTo(map)

map.on(L.Draw.Event.CREATED,function(e){

const layer = e.layer
const polygon = layer.toGeoJSON()

saveTerritory(polygon)

map.addLayer(layer)

})