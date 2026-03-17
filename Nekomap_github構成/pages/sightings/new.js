import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function NewSight(){

const [lat,setLat]=useState("")
const [lng,setLng]=useState("")
const [comment,setComment]=useState("")

const save = async () => {

await supabase
.from("sightings")
.insert({
lat,
lng,
description:comment
})

alert("投稿しました")

}

return(

<div>

<h2>目撃情報</h2>

<input
placeholder="緯度"
onChange={e=>setLat(e.target.value)}
/>

<input
placeholder="経度"
onChange={e=>setLng(e.target.value)}
/>

<textarea
placeholder="コメント"
onChange={e=>setComment(e.target.value)}
/>

<button onClick={save}>
投稿
</button>

</div>

)

}