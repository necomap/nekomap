import { useRouter } from "next/router"
import AdBanner from "../components/AdBanner"
import {
  Map, Cat, ClipboardList, AlertTriangle,
  Users, Scissors, BookOpen, LogIn
} from "lucide-react"

export default function Home() {
  const router = useRouter()

  const menus = [
    { icon: <Map size={22} />, label: "地図を見る", path: "/map", color: "#4a90e2" },
    { icon: <Cat size={22} />, label: "地域猫一覧", path: "/cats", color: "#e07a5f" },
    { icon: <ClipboardList size={22} />, label: "掲示板", path: "/board", color: "#7b61ff" },
    { icon: <AlertTriangle size={22} />, label: "困りごとマップ", path: "/reports", color: "#f39c12" },
    { icon: <Users size={22} />, label: "ボランティア募集", path: "/volunteer", color: "#43a047" },
    { icon: <Scissors size={22} />, label: "TNRカレンダー", path: "/tnr", color: "#e91e63" },
    { icon: <BookOpen size={22} />, label: "使い方ガイド", path: "/guide", color: "#00bcd4" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#fff9f5" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
        <img src="/cat-icon.png" alt="NekoMap" style={{ width: 100, height: 100, objectFit: "contain", marginBottom: 16 }} />
        <h1 style={{ fontSize: 36, color: "#e07a5f", marginBottom: 8, fontWeight: 700 }}>NekoMap</h1>
        <p style={{ color: "#9e7b6e", marginBottom: 32, fontSize: 16 }}>
          地域猫の情報をみんなでシェアしよう
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {menus.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                padding: "16px 20px", background: "white",
                border: "2px solid #f2c4a0", borderRadius: 16,
                fontSize: 16, cursor: "pointer", fontFamily: "inherit",
                color: "#3d3230", fontWeight: 500,
                boxShadow: "0 2px 8px rgba(224,122,95,0.08)",
                display: "flex", alignItems: "center", gap: 12,
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#fff0e8"}
              onMouseOut={(e) => e.currentTarget.style.background = "white"}
            >
              <span style={{ color: item.color }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <AdBanner />

        <p style={{ marginTop: 16, fontSize: 13, color: "#c4a090" }}>
          <a href="/login" style={{ color: "#e07a5f", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <LogIn size={14} /> ログイン
          </a>
          {" "}または{" "}
          <a href="/register" style={{ color: "#e07a5f" }}>新規登録</a>
        </p>
      </div>
    </div>
  )
}