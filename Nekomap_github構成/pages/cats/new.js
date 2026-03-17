import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function NewCat(){

const [name,setName]=useState("")
const [features,setFeatures]=useState("")

const save = async () => {

await supabase
.from("cats")
.insert({
name,
features
})

alert("登録しました")

}

return(

<div>

<h2>猫登録</h2>

<input
placeholder="名前"
onChange={e=>setName(e.target.value)}
/>

<textarea
placeholder="特徴"
onChange={e=>setFeatures(e.target.value)}
/>

<button onClick={save}>
登録
</button>

</div>

)

}