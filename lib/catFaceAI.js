// lib/catFaceAI.js
//
// 猫の写真から「特徴ベクトル（embedding）」を計算するユーティリティ。
// すべてブラウザ側（クライアントサイド）で完結し、外部APIの契約や
// サーバー費用は一切発生しない（無料）。
//
// 使用モデル: MobileNet v1 (alpha=1.0) / TensorFlow.js
// 出力: 1024次元のベクトル（DB/add_cat_face_recognition.sql の
//       face_embedding vector(1024) 列と次元数を一致させること）
//
// ★重要な注意点★
// これは「猫の個体識別」専用に学習されたモデルではなく、
// 汎用の画像認識モデル（ImageNetで学習）の特徴量を流用した
// 簡易的な類似検索です。毛色・柄・体格などの大まかな見た目の
// 近さは拾えますが、双子のようによく似た猫を正確に区別すること
// はできません。あくまで「候補を絞り込むための参考情報」として
// 扱い、最終判断は必ず人の目で確認してください。

let modelPromise = null

// モデルは初回のみ読み込み、以降はページ内で使い回す（毎回のダウンロードを防ぐ）
function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import("@tensorflow/tfjs")
      const mobilenet = await import("@tensorflow-models/mobilenet")
      await tf.ready()
      return mobilenet.load({ version: 1, alpha: 1.0 })
    })().catch((err) => {
      // 読み込み失敗時は次回また試せるようにリセットしておく
      modelPromise = null
      throw err
    })
  }
  return modelPromise
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"))
    img.src = URL.createObjectURL(file)
  })
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"))
    img.src = url
  })
}

/**
 * File（アップロードされた写真）または画像URLから特徴ベクトルを計算する。
 * @param {File|string} fileOrUrl
 * @returns {Promise<number[]>} 1024次元のベクトル（配列）
 */
export async function getImageEmbedding(fileOrUrl) {
  if (typeof window === "undefined") {
    throw new Error("getImageEmbeddingはブラウザ上でのみ実行できます")
  }
  const model = await loadModel()
  const img = typeof fileOrUrl === "string"
    ? await loadImageFromUrl(fileOrUrl)
    : await loadImageFromFile(fileOrUrl)

  const embeddingTensor = model.infer(img, true)
  const embedding = Array.from(await embeddingTensor.data())
  embeddingTensor.dispose()
  return embedding
}

/**
 * 計算した特徴ベクトルを、Supabase(pgvector)に保存できる文字列形式に変換する。
 * 例: "[0.12,0.34,...]"
 */
export function embeddingToVectorLiteral(embedding) {
  return `[${embedding.join(",")}]`
}
