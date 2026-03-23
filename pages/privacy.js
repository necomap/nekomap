import { Shield } from "lucide-react"
import PageTitle from "../components/PageTitle"

export default function Privacy() {
  return (
    <div style={{ maxWidth: 640, margin: "40px auto", padding: 24 }}>
      <PageTitle icon={<Shield size={20} color="#e07a5f" />} title="個人情報の取り扱いについて" />
      <p style={{ color: "#9e7b6e", marginBottom: 32, fontSize: 14 }}>
        最終更新日：2026年3月
      </p>

      {[
        {
          title: "1. 収集する情報",
          body: "会員登録時にメールアドレス・お名前・ニックネームを収集します。任意で団体名・ホームページ・寄付情報を登録できます。投稿時に位置情報（緯度・経度）を取得する場合があります。",
        },
        {
          title: "2. 公開される情報",
          body: "団体名・ホームページ・担当地域・寄付情報のみ公開されます。メールアドレス・住所・電話番号は他のユーザーには公開されません。",
        },
        {
          title: "3. 位置情報の取り扱い",
          body: "一般ユーザーが投稿した位置情報は、プライバシー保護のため実際の位置から50〜100m程度ぼかして表示されます。認証済み団体は正確な位置情報を登録できます。",
        },
        {
          title: "4. 情報の利用目的",
          body: "収集した情報は地域猫活動の支援・情報共有のみに使用します。第三者への販売・提供は行いません。",
        },
        {
          title: "5. セキュリティ",
          body: "データはSupabase（米国）のサーバーで管理され、業界標準の暗号化が適用されます。パスワードは暗号化して保存されます。",
        },
        {
          title: "6. 不適切な投稿への対応",
          body: "通報された投稿は3件以上の通報で自動的に非表示となり、管理者が確認の上対応します。悪質なユーザーはブラックリストに登録し、再登録を防止します。",
        },
        {
          title: "7. お問い合わせ",
          body: "個人情報の削除・修正をご希望の場合は管理者までご連絡ください。",
        },
      ].map((section) => (
        <div key={section.title} style={sectionStyle}>
          <h3 style={{ margin: "0 0 8px", color: "#e07a5f", fontSize: 16 }}>{section.title}</h3>
          <p style={{ margin: 0, fontSize: 14, color: "#444", lineHeight: 1.8 }}>{section.body}</p>
        </div>
      ))}
    </div>
  )
}

const sectionStyle = {
  border: "1px solid #f2c4a0", borderRadius: 16,
  padding: 20, marginBottom: 16, background: "white",
}
