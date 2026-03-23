import { useRouter } from "next/router"
import AdBanner from "../components/AdBanner"
import {
  Map, Cat, ClipboardList, AlertTriangle,
  Users, Scissors, BookOpen, Heart, Trophy
} from "lucide-react"

export default function Home() {
  const router = useRouter()

  const menus = [
    { icon: <Map size={22} />, label: "地図を見る", path: "/map", color: "#4a90e2", desc: "地域猫のナワバリや目撃情報を地図で確認" },
    { icon: <Cat size={22} />, label: "地域猫一覧", path: "/cats", color: "#e07a5f", desc: "登録されている地域猫の情報を見る" },
    { icon: <ClipboardList size={22} />, label: "掲示板", path: "/board", color: "#7b61ff", desc: "猫探し・目撃情報・保護情報を共有" },
    { icon: <AlertTriangle size={22} />, label: "困りごとマップ", path: "/reports", color: "#f39c12", desc: "糞尿被害やけんかなどの困りごとを報告" },
    { icon: <Users size={22} />, label: "ボランティア募集", path: "/volunteer", color: "#43a047", desc: "捕獲のお手伝いなどを募集・応募" },
    { icon: <Scissors size={22} />, label: "TNRカレンダー", path: "/tnr", color: "#e91e63", desc: "捕獲・手術・リリースの予定を管理" },
    { icon: <Heart size={22} />, label: "寄付・支援", path: "/donate", color: "#e07a5f", desc: "地域猫活動を支援する団体への寄付" },
    { icon: <Trophy size={22} />, label: "地域ランキング", path: "/ranking", color: "#f39c12", desc: "TNR達成数などの地域別ランキング" },
    { icon: <BookOpen size={22} />, label: "使い方ガイド", path: "/guide", color: "#00bcd4", desc: "NekoMapの使い方を詳しく解説" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#fff9f5" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px" }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img src="/cat-icon.png" alt="NekoMap" style={{ width: 100, height: 100, objectFit: "contain", marginBottom: 16 }} />
          <h1 style={{ fontSize: 36, color: "#e07a5f", marginBottom: 8, fontWeight: 700 }}>NekoMap</h1>
          <p style={{ color: "#9e7b6e", fontSize: 16, lineHeight: 1.8 }}>
            地域猫の情報をみんなでシェアするプラットフォームです。<br />
            ナワバリ・目撃情報・TNR記録・困りごとを地図上で管理し、<br />
            地域の猫ボランティアをつなぎます。
          </p>
        </div>

        <AdBanner />

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
          {menus.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                padding: "14px 20px", background: "white",
                border: "2px solid #f2c4a0", borderRadius: 16,
                fontSize: 15, cursor: "pointer", fontFamily: "inherit",
                color: "#3d3230", fontWeight: 500,
                boxShadow: "0 2px 8px rgba(224,122,95,0.08)",
                display: "flex", alignItems: "center", gap: 12,
                textAlign: "left",
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#fff0e8"}
              onMouseOut={(e) => e.currentTarget.style.background = "white"}
            >
              <span style={{
                color: item.color, width: 40, height: 40,
                background: item.color + "18", borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "#9e7b6e", marginTop: 2 }}>{item.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div style={{
          background: "white", border: "1px solid #f2c4a0",
          borderRadius: 16, padding: 20, marginBottom: 24,
        }}>
          <h2 style={{ margin: "0 0 12px", color: "#e07a5f", fontSize: 18 }}>NekoMapとは</h2>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#444", lineHeight: 1.8 }}>
            地域猫（TNR活動で管理されている猫）の情報を地域のボランティアや住民がシェアするためのプラットフォームです。
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { icon: "🗺️", text: "ナワバリを地図で管理" },
              { icon: "✂️", text: "TNRの記録・予定管理" },
              { icon: "👀", text: "目撃情報の共有" },
              { icon: "🙋", text: "ボランティアの連携" },
              { icon: "⚠️", text: "困りごとの解決" },
              { icon: "💝", text: "団体への寄付支援" },
            ].map((f) => (
              <div key={f.text} style={{
                padding: "8px 12px", background: "#fff9f5",
                borderRadius: 10, fontSize: 13, color: "#3d3230",
                border: "1px solid #f2c4a0",
              }}>
                {f.icon} {f.text}
              </div>
            ))}
          </div>
        </div>

        <AdBanner />

        <p style={{ textAlign: "center", fontSize: 13, color: "#c4a090" }}>
          <a href="/login" style={{ color: "#e07a5f" }}>ログイン</a>
          {" "}または{" "}
          <a href="/register" style={{ color: "#e07a5f" }}>新規登録</a>
          {" ・ "}
          <a href="/terms" style={{ color: "#c4a090" }}>利用規約</a>
          {" ・ "}
          <a href="/privacy" style={{ color: "#c4a090" }}>プライバシーポリシー</a>
        </p>
      </div>
    </div>
  )
}
