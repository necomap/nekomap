import "../styles/globals.css"
import { useEffect } from "react"
import Navbar from "../components/Navbar"
import AdBanner from "../components/AdBanner"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabase"

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const hideNavbar = ["/login", "/register"].includes(router.pathname)
  // 広告（Amazonアソシエイト）は全ページ共通で、各ページの一番下に表示する。
  // 地図・チャットルームは画面いっぱいの表示のため、ログイン系・管理画面は利用目的上、表示しない。
  const hideAd = [
    "/map", "/chat/[room]", "/login", "/register", "/reset-password", "/admin",
  ].includes(router.pathname)

  useEffect(() => {
    // Googleログイン等のOAuth初回サインイン時、usersテーブルに
    // プロフィール行がまだ無ければ自動作成する（無いと他の画面で不具合が出るため）
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) return
      const user = session.user

      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()

      if (existing) return

      const meta = user.user_metadata || {}
      await supabase.from("users").insert({
        id: user.id,
        email: user.email,
        nickname: meta.full_name || meta.name || user.email?.split("@")[0] || "匿名",
        name: meta.full_name || meta.name || "",
        avatar: meta.avatar_url || meta.picture || null,
        account_type: "general",
        role: "user",
      })
    })

    return () => listener?.subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    // 通知の有無に関わらず、PWAとして「ホーム画面に追加」できるように
    // Service Workerを登録しておく（iOSでの通知利用にはホーム画面追加が必須のため）
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((e) => {
        console.log("Service Worker登録に失敗:", e.message)
      })
    }
  }, [])

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Component {...pageProps} />
      {!hideAd && (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 24px 24px" }}>
          <AdBanner />
        </div>
      )}
    </>
  )
}