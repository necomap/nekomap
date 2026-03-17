import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function Login(){

const [email,setEmail]=useState("")
const [password,setPassword]=useState("")

const login = async () => {

const {error} =
await supabase.auth.signInWithPassword({
email,
password
})

if(!error){
location.href="/map"
}

}

return(

<div>

<h2>ログイン</h2>

<input
placeholder="メール"
onChange={e=>setEmail(e.target.value)}
/>

<input
type="password"
placeholder="パスワード"
onChange={e=>setPassword(e.target.value)}
/>

<button onClick={login}>
ログイン
</button>

</div>

)

}