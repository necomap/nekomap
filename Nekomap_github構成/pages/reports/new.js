import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function NewReport(){

const [type,setType]=useState("")
const [comment,setComment]=useState("")

const save = async () => {

await supabase
.from("problem_reports")
.insert({
type,
description:comment
})

alert("投稿しました")

}

return(

<div>

<h2>困りごと投稿</h2>

<select
onChange={e=>setType(e.target.value)}
>

<option value="fight">喧嘩</option>
<option value="toilet">糞尿</option>
<option value="food">ごはん</option>
<option value="injury">怪我</option>

</select>

<textarea
onChange={e=>setComment(e.target.value)}
/>

<button onClick={save}>
投稿
</button>

</div>

)

}