import { Html, Head, Main, NextScript } from "next/document"

export default function Document() {
  return (
    <Html lang="ja">
      <Head>
        <meta name="description" content="地域猫の情報をみんなでシェアするマップアプリ" />
        <meta name="keywords" content="地域猫,TNR,野良猫,猫マップ,ボランティア" />
        <meta property="og:title" content="NekoMap" />
        <meta property="og:description" content="地域猫の情報をみんなでシェアしよう" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://neko-map-app.vercel.app" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2277926623752174"
          crossOrigin="anonymous"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}