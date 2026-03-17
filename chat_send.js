const sendMessage = async () => {

await supabase
.from("chats")
.insert({
room_id:room,
sender:user.id,
message:text
})

}