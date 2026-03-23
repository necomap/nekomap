import { useRouter } from "next/router"
import { Cat } from "lucide-react"
import PageTitle from "../../components/PageTitle"

export default function About() {
  const router = useRouter()

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Cat size={20} color="#e07a5f" />} title="NekoMapについて" />
      <p style={{ color: "#9e7b6e", marginBottom: 32, fontSize: 14 }}>
        地域猫活動をサポートするための情報共有プラットフォーム
      </p>

      {[
        {
          title: "NekoMapとは",
          body: "NekoMapは、全国の地域猫活動をサポートするための情報共有プラットフォームです。地域猫のナワバリ管理・目撃情報の共有・TNR活動の記録・困りごとの報告など、地域猫に関わるすべての情報を一つの地図上で管理できます。",
        },
        {
          title: "地域猫活動とは",
          body: "地域猫活動とは、地域に生息する野良猫を地域社会で管理・保護する取り組みです。TNR（Trap・Neuter・Return）と呼ばれる、捕獲・不妊去勢手術・元の場所への戻しや定期的な世話を行うことで、野良猫の数を徐々にコントロールし、人と猫が共生できる環境を作ることを目指しています。",
        },
        {
          title: "主な機能",
          body: "地図上でのナワバリ管理・目撃情報の共有・TNR活動の記録・困りごとの報告・掲示板・チャット・健康記録の管理など、地域猫活動に必要な機能を網羅しています。",
        },
        {
          title: "利用料金",
          body: "NekoMapは完全無料でご利用いただけます。会員登録をすることで、すべての機能をご利用いただけます。",
        },
        {
          title: "ご参加ください",
          body: "個人ボランティアから保護団体まで、地域猫活動に関わるすべての人がご利用できます。ぜひ登録いただき、地域猫活動にご参加ください。",
        },
      ].map((section) => (
        <div key={section.title} style={cardStyle}>
          <h3 style={{ margin: "0 0 8px", color: "#e07a5f", fontSize: 16 }}>{section.title}</h3>
          <p style={{ margin: 0, fontSize: 14, color: "#444", lineHeight: 1.8 }}>{section.body}</p>
        </div>
      ))}

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button onClick={() => router.push("/register")} style={buttonStyle}>
          新規登録する
        </button>
        <button onClick={() => router.push("/guide")} style={{ ...buttonStyle, background: "#f0e6e0", color: "#e07a5f" }}>
          使い方ガイド
        </button>
      </div>
    </div>
  )
}

const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16,
  padding: 20, marginBottom: 16, background: "white",
}
const buttonStyle = {
  padding: "12px 24px", background: "#e07a5f", color: "white",
  border: "none", borderRadius: 12, fontSize: 15,
  cursor: "pointer", fontFamily: "inherit",
}
