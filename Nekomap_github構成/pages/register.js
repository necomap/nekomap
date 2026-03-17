import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function Register(){

const [email,setEmail]=useState("")
const [password,setPassword]=useState("")

const register = async () => {

await supabase.auth.signUp({
email,
password
})

alert("登録メール送信しました")

}

return(

<div>

<h2>会員登録</h2>

<input
placeholder="メール"
onChange={e=>setEmail(e.target.value)}
/>

<input
type="password"
placeholder="パスワード"
onChange={e=>setPassword(e.target.value)}
/>

<button onClick={register}>
登録
</button>

</div>

)

}