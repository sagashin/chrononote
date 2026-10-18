import type {Metadata, Viewport} from 'next';
import {Plus_Jakarta_Sans, Noto_Sans_JP, JetBrains_Mono} from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: 'resizes-content',
};

export const metadata: Metadata = {
  title: 'ChronoNote — パーソナル記録＆AIトレンド分析',
  description:
    '思いついたことや情報を1秒でサッと記録し、AIが自動で分野・タグ分類、関心トレンド分析、関連ニュース収集を行うパーソナルナレッジ＆トレンド分析アプリ。',
  openGraph: {
    title: 'ChronoNote — パーソナル記録＆AIトレンド分析',
    description:
      '思いついたことや情報を1秒でサッと記録し、AIが自動で分野・タグ分類、関心トレンド分析、関連ニュース収集を行うパーソナルナレッジ＆トレンド分析アプリ。',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChronoNote — パーソナル記録＆AIトレンド分析',
    description:
      '思いついたことや情報を1秒でサッと記録し、AIが自動で分野・タグ分類、関心トレンド分析、関連ニュース収集を行うパーソナルナレッジ＆トレンド分析アプリ。',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="ja"
      className={`${plusJakarta.variable} ${notoSansJP.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body
        className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-700 dark:selection:text-sky-200"
        style={{
          fontFamily: 'var(--font-display), var(--font-sans), sans-serif',
        }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
