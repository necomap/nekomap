export default function About() {
  return (
    <div style={{ maxWidth: 640, margin: "40px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>🐱 NekoMapについて</h1>
      <p style={{ color: "#9e7b6e", marginBottom: 32, fontSize: 14 }}>
        地域猫活動をサポートするための情報共有プラットフォーム
      </p>

      {[
        {
          title: "NekoMapとは",
          body: "NekoMapは、全国の地域猫活動をサポートするための情報共有プラットフォームです。地域猫のナワバリ管理、目撃情報の共有、TNR活動の記録、困りごとの報告など、地域猫に関わるすべての情報を一つの地図上で管理できます。",
        },
        {
          title: "地域猫活動とは",
          body: "地域猫活動とは、地域に生息する野良猫を地域全体で管理・保護する取り組みです。TNR（Trap・Neuter・Return）と呼ばれる、捕獲・不妊去勢手術・元の場所への返還を行うことで、野良猫の数を適切にコントロールし、人と猫が共存できる環境を作ることを目指しています。",
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
          body: "個人ボランティアから保護団体まで、地域猫活動に関わるすべての人が利用できます。ぜひご登録いただき、地域猫活動にご参加ください。",
        },
      ].map((section) => (
        <div key={section.title} style={cardStyle}>
          <h3 style={{ margin: "0 0 8px", color: "#e07a5f", fontSize: 16 }}>{section.title}</h3>
          <p style={{ margin: 0, fontSize: 14, color: "#444", lineHeight: 1.8 }}>{section.body}</p>
        </div>
      ))}
    </div>
  )
}

const cardStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16,
  padding: 20, marginBottom: 16, background: "white",
}
