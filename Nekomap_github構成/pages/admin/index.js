import { useEffect,useState } from "react"
import { supabase } from "../../lib/supabase"

export default function Admin(){

const [posts,setPosts]=useState([])

useEffect(()=>{

load()

},[])

const load = async()=>{

const {data} =
await supabase
.from("posts")
.select("*")

setPosts(data)

}

const remove = async(id)=>{

await supabase
.from("posts")
.delete()
.eq("id",id)

load()

}

return(

<div>

<h2>管理画面</h2>

{posts.map(p=>(
<div key={p.id}>

<p>{p.title}</p>

<button onClick={()=>remove(p.id)}>
削除
</button>

</div>
))}

</div>

)

}