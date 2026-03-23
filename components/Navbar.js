import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useRouter } from "next/router"
import {
  Map, Cat, ClipboardList, AlertTriangle, Menu, X,
  LogIn, LogOut, Plus, MapPin, Scissors, Users,
  Heart, Shield, BookOpen, Mail, Trophy, Settings,
  Home, MessageCircle
} from "lucide-react"

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }
    getUser()
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/")
  }

  const go = (path) => { router.push(path); setMenuOpen(false) }

  return (
    <>
      <nav style={navStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => go("/")}>
          <img src="/cat-icon.png" alt="NekoMap" style={{ width: 32, height: 32, objectFit: "contain" }} />
          <span style={{ fontWeight: 700, fontSize: 18, color: "#e07a5f" }}>NekoMap</span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button onClick={() => go("/map")} style={navBtn} title="地図">
            <Map size={18} />
          </button>
          <button onClick={() => go("/cats")} style={navBtn} title="地域猫">
            <Cat size={18} />
          </button>
          <button onClick={() => go("/board")} style={navBtn} title="掲示板">
            <ClipboardList size={18} />
          </button>
          <button onClick={() => go("/reports")} style={navBtn} title="困りごと">
            <AlertTriangle size={18} />
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)} style={navBtn}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
            <span style={{ fontSize: 12, marginLeft: 2 }}>メニュー</span>
          </button>
          {user ? (
            <button onClick={handleLogout} style={logoutBtn}>
              <LogOut size={14} style={{ marginRight: 4 }} />
              ログアウト
            </button>
          ) : (
            <button onClick={() => go("/login")} style={loginBtn}>
              <LogIn size={14} style={{ marginRight: 4 }} />
              ログイン
            </button>
          )}
        </div>
      </nav>

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={overlay} />
          <div style={menuStyle}>
            <p style={menuSection}>地図・投稿</p>
            <button onClick={() => go("/map")} style={menuBtn}>
              <Map size={16} /> 地図を見る
            </button>
            <button onClick={() => go("/sightings/new")} style={menuBtn}>
              <MapPin size={16} /> 目撃情報を投稿
            </button>
            <button onClick={() => go("/stray/new")} style={menuBtn}>
              <Cat size={16} /> 野良猫出没情報
            </button>
            <button onClick={() => go("/reports")} style={menuBtn}>
              <AlertTriangle size={16} /> 困りごとマップ
            </button>
            <button onClick={() => go("/spots/new")} style={menuBtn}>
              <MapPin size={16} /> スポット登録
            </button>
            <button onClick={() => go("/territories")} style={menuBtn}>
              <Map size={16} /> ナワバリ管理
            </button>

            <p style={menuSection}>猫情報</p>
            <button onClick={() => go("/cats")} style={menuBtn}>
              <Cat size={16} /> 地域猫一覧
            </button>
            <button onClick={() => go("/cats/new")} style={menuBtn}>
              <Plus size={16} /> 猫を登録
            </button>
            <button onClick={() => go("/tnr")} style={menuBtn}>
              <Scissors size={16} /> TNRカレンダー
            </button>

            <p style={menuSection}>コミュニティ</p>
            <button onClick={() => go("/board")} style={menuBtn}>
              <ClipboardList size={16} /> 掲示板
            </button>
            <button onClick={() => go("/volunteer")} style={menuBtn}>
              <Users size={16} /> ボランティア募集
            </button>
            <button onClick={() => go("/donate")} style={menuBtn}>
              <Heart size={16} /> 寄付・支援
            </button>
            <button onClick={() => go("/ranking")} style={menuBtn}>
              <Trophy size={16} /> 地域ランキング
            </button>

            <p style={menuSection}>その他</p>
            <button onClick={() => go("/guide")} style={menuBtn}>
              <BookOpen size={16} /> 使い方ガイド
            </button>
            <button onClick={() => go("/terms")} style={menuBtn}>📜 利用規約</button>
            <button onClick={() => go("/privacy")} style={menuBtn}>
              <Shield size={16} /> プライバシーポリシー
            </button>
            <button onClick={() => go("/contact")} style={menuBtn}>
              <Mail size={16} /> お問い合わせ
            </button>
            {user && (
              <button onClick={() => go("/profile/edit")} style={menuBtn}>
                <Settings size={16} /> プロフィール編集
              </button>
            )}
            {user && (
              <button onClick={() => go("/admin")} style={menuBtn}>
                <Settings size={16} /> 管理画面
              </button>
            )}
            {user && (
              <button
                onClick={handleLogout}
                style={{ ...menuBtn, color: "#e07a5f" }}
              >
                <LogOut size={16} /> ログアウト
              </button>
            )}
          </div>
        </>
      )}
    </>
  )
}

const navStyle = {
  position: "sticky", top: 0, zIndex: 1000,
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "12px 24px",
  background: "rgba(255,249,245,0.95)",
  backdropFilter: "blur(8px)",
  borderBottom: "1px solid #f2c4a0",
  boxShadow: "0 2px 8px rgba(224,122,95,0.08)",
}
const navBtn = {
  padding: "6px 10px", background: "none", border: "none",
  borderRadius: 20, cursor: "pointer", fontSize: 13,
  color: "#3d3230", fontFamily: "inherit",
  display: "flex", alignItems: "center", gap: 2,
}
const loginBtn = {
  padding: "6px 16px", background: "#e07a5f", color: "white",
  border: "none", borderRadius: 20, cursor: "pointer", fontSize: 13,
  fontFamily: "inherit", display: "flex", alignItems: "center",
}
const logoutBtn = {
  padding: "6px 16px", background: "#f0e6e0", color: "#e07a5f",
  border: "none", borderRadius: 20, cursor: "pointer", fontSize: 13,
  fontFamily: "inherit", display: "flex", alignItems: "center",
}
const overlay = {
  position: "fixed", inset: 0, zIndex: 998,
}
const menuStyle = {
  position: "fixed", top: 56, right: 16, zIndex: 999,
  background: "white", borderRadius: 16, padding: "8px 4px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
  border: "1px solid #f2c4a0",
  display: "flex", flexDirection: "column",
  minWidth: 220, maxHeight: "80vh", overflowY: "auto",
}
const menuSection = {
  margin: "8px 12px 4px", fontSize: 11,
  color: "#c4a090", fontWeight: 600, letterSpacing: "0.05em",
}
const menuBtn = {
  padding: "10px 16px", background: "none", border: "none",
  borderRadius: 10, cursor: "pointer", fontSize: 14,
  textAlign: "left", fontFamily: "inherit", color: "#3d3230",
  width: "100%", display: "flex", alignItems: "center", gap: 8,
}