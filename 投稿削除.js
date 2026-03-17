await supabase
.from("posts")
.delete()
.eq("id",postId)