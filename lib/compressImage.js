// 写真アップロード前にブラウザ上でリサイズ・圧縮するヘルパー。
// そのままアップロードすると、スマホの高解像度写真は数MBになることも多く、
// ストレージ容量・通信量を圧迫するため、長辺を一定サイズ以内に縮小し、
// JPEGで再圧縮してからアップロードする。
//
// 何らかの理由で圧縮に失敗した場合は、安全のため元のファイルをそのまま返す
// （＝アップロード自体は失敗させない）。
export function compressImage(file, { maxSize = 1600, quality = 0.8 } = {}) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith("image/")) {
      resolve(file)
      return
    }
    // GIFなどアニメーションがある場合は圧縮すると壊れるので対象外にする
    if (file.type === "image/gif") {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          } else {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }
        try {
          const canvas = document.createElement("canvas")
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (!blob) { resolve(file); return }
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.\w+$/, "") + ".jpg",
                { type: "image/jpeg" }
              )
              // 圧縮後の方がかえって大きい場合（元々小さい画像など）は元のファイルを使う
              resolve(compressedFile.size < file.size ? compressedFile : file)
            },
            "image/jpeg",
            quality
          )
        } catch (err) {
          resolve(file)
        }
      }
      img.onerror = () => resolve(file)
      img.src = e.target.result
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}
