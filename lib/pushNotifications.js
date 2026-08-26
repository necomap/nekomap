import { supabase } from "./supabase"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

// VAPID公開鍵（base64url文字列）を、PushManager.subscribeが要求する
// Uint8Array形式に変換するための定型処理
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
}

// 現在このブラウザで通知が有効になっているかを調べる
export async function getPushSubscriptionStatus() {
  if (!isPushSupported()) return false
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}

// 通知を有効化する（ブラウザの許可ダイアログが出る）
export async function subscribeToPush(userId) {
  if (!isPushSupported()) {
    throw new Error("このブラウザは通知に対応していません")
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error("通知機能が設定されていません（管理者に連絡してください）")
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    throw new Error("通知が許可されませんでした（ブラウザの通知設定をご確認ください）")
  }

  const registration = await navigator.serviceWorker.register("/sw.js")
  await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = subscription.toJSON()
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: "endpoint" }
  )
  if (error) throw error
  return true
}

// 通知を無効化する
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint)
    await subscription.unsubscribe()
  }
}
