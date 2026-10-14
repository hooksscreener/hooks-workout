import { Html, Head, Main, NextScript } from "next/document";
import { deriveTheme } from "../lib/theme";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Hooks Workout" />
        <meta name="theme-color" content="#000000" />
        <title>Hooks Workout</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var derive=${deriveTheme.toString()};var s=JSON.parse(localStorage.getItem('hooksSettings')||'{}');var t=derive(s.mode||'dark',s.accent||'#ff6600',window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches);var r=document.documentElement;r.setAttribute('data-theme',t.scheme);for(var k in t.vars){r.style.setProperty(k,t.vars[k]);}}catch(e){}})();`,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
