// お問い合わせ通知メールAPI（サーバー側専用）
//
// 【背景】
// これまで/contactページはお問い合わせ内容をcontactsテーブルに保存する
// だけで、メールを送る処理が一切実装されていなかった（「管理者が確認後、
// メールにてご連絡いたします」という画面表示は、管理画面を管理者が手動で
// 見に行って初めて気づく、という意味でしかなかった）。
// 「問い合わせページからテスト送信したが管理者にも入力した送信元アドレスにも
// メールとどかない」との報告を受け、原因（メール送信処理が存在しなかったこと）
// を特定し、以下の通知メールを送るようにした。
//
//   1. 管理者（role='admin'の全ユーザー）へ、問い合わせ内容の通知メール
//      （返信先(reply-to)を問い合わせた本人のメールアドレスにしておくので、
//      管理者はメールソフトの「返信」を押すだけで本人に直接返信できる）
//   2. 問い合わせた本人へ、内容を確認できる受付完了メール
//
// contactsテーブルのSELECTは管理者専用のRLSになっており、フォーム送信者
// （未ログインの場合も多い）が自分の投稿を読み返すことはできないため、
// 挿入後にDBから読み直すのではなく、クライアントが送信したのと同じ内容を
// そのままこのAPIにも渡してもらう設計にしている（このAPIが送る内容は
// 「本人が今まさに送信したお問い合わせフォームの内容」そのものであり、
// contactsテーブルへのINSERT自体が誰でも可能な設計と同じ信頼レベルのため、
// 追加の権限チェックは不要）。
//
// 事前準備: RESEND_API_KEY（未設定の場合は何もせず200を返す。お問い合わせの
// DB保存自体は完了しているので、フォーム送信そのものは失敗させない）
//
// 【2026-09-30追記】送信ボタンを押しても30秒以上「送信中...」のまま固まる
// という報告を受けた。原因はこのAPI（またはResend/Supabaseへの外部通信）が
// 遅い・応答が返ってこない場合に、呼び出し元(pages/contact/index.js)が
// このAPIの応答をawaitしたまま画面を先に進めない実装になっていたこと。
// 対策として、呼び出し元はこのAPIの応答を待たずに完了画面を表示するように
// 変更した（お問い合わせ自体はすでにDB保存済みのため）。あわせて、この
// API自身もResendへの通信1件ごとに8秒のタイムアウトを設け、外部サービスが
// 応答しない場合でもこの関数が長時間ハングし続けないようにした。

import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

// 指定ミリ秒で応答がなければタイムアウトさせる（Resend/Supabaseへの外部
// 通信がハングしても、この関数自体が延々と実行され続けないようにするため）
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label}がタイムアウトしました(${ms}ms)`)), ms)
    ),
  ])
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { name, email, category, message } = req.body || {}
  if (!name || !email || !category || !message) {
    return res.status(400).json({ error: "入力内容が不足しています" })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!resendApiKey || !serviceRoleKey) {
    // メール送信は必須機能ではない（お問い合わせ自体はDBに保存済みで、
    // 管理画面からいつでも確認できる）ので、未設定でもエラーにはしない
    return res.status(200).json({ ok: true, skipped: "not_configured" })
  }

  const resend = new Resend(resendApiKey)
  const from = process.env.RESEND_FROM_EMAIL || "NekoMap <onboarding@resend.dev>"
  const siteUrl = process.env.SITE_URL || "https://neko-map-app.vercel.app"

  let adminSent = false
  let confirmSent = false

  // 1. 管理者へ通知
  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: admins } = await withTimeout(
      adminClient.from("users").select("email").eq("role", "admin"),
      8000,
      "管理者メールアドレスの取得"
    )
    const adminEmails = (admins || []).map((a) => a.email).filter(Boolean)

    if (adminEmails.length > 0) {
      await withTimeout(
        resend.emails.send({
          from,
          to: adminEmails,
          replyTo: email,
          subject: `【NekoMap】お問い合わせ: ${category}`,
          text: `お名前: ${name}\nメールアドレス: ${email}\nカテゴリ: ${category}\n\n${message}\n\n---\n管理画面から対応状況を更新できます: ${siteUrl}/admin`,
        }),
        8000,
        "管理者宛メール送信"
      )
      adminSent = true
    } else {
      console.error("問い合わせ通知メール: role='admin'のユーザーが見つかりませんでした")
    }
  } catch (e) {
    console.error("問い合わせ通知メール(管理者宛)送信エラー:", e.message)
  }

  // 2. 送信者本人へ受付完了メール
  try {
    await withTimeout(
      resend.emails.send({
        from,
        to: email,
        subject: "【NekoMap】お問い合わせを受け付けました",
        text: `${name} 様\n\nNekoMapへのお問い合わせありがとうございます。内容を確認の上、担当者よりご連絡いたします。\n\n----- お送りいただいた内容 -----\nカテゴリ: ${category}\n${message}\n--------------------------------\n\n※このメールは送信専用です。返信いただいても内容は届きませんので、ご了承ください。`,
      }),
      8000,
      "送信者宛メール送信"
    )
    confirmSent = true
  } catch (e) {
    console.error("問い合わせ確認メール(送信者宛)送信エラー:", e.message)
  }

  return res.status(200).json({ ok: true, adminSent, confirmSent })
}
