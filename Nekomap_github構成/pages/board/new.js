import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function NewPost(){

const [title,setTitle]=useState("")
const [body,setBody]=useState("")

const save = async () => {

await supabase
.from("posts")
.insert({
title,
body
})

alert("投稿しました")

}

return(

<div>

<h2>掲示板投稿</h2>

<input
placeholder="タイトル"
onChange={e=>setTitle(e.target.value)}
/>

<textarea
onChange={e=>setBody(e.target.value)}
/>

<button onClick={save}>
投稿
</button>

</div>

)

}