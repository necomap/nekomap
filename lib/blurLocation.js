// 一般ユーザーの位置を50〜100mぼかす
export function blurLocation(lat, lng, userType = "general") {
  if (userType === "admin" || userType === "organization") {
    return { lat, lng }
  }
  // 約50〜100mのランダムなずれを加える
  const blur = 0.001 // 約100m
  const randomLat = (Math.random() - 0.5) * blur
  const randomLng = (Math.random() - 0.5) * blur
  return {
    lat: lat + randomLat,
    lng: lng + randomLng,
  }
}