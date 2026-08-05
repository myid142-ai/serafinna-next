import type { Metadata } from "next";
import "@/styles/site.css";

/**
 * No next/font / Google Fonts — on iPhone LTE+VPN every extra TLS request and
 * woff2 file delays first paint by seconds. System UI fonts paint immediately.
 */
const assetHost = (
  process.env.NEXT_PUBLIC_ASSET_HOST || "https://serafinna.vercel.app"
).replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Серафинна — гостевой дом в Джубге с видом на море",
  description:
    "Гостевой дом в Джубге «Серафинна»: снять номер у моря с панорамным видом. Ул. Маяковского, 5А. Парковка, Wi‑Fi. От 4 500 ₽. Рейтинг 4.9.",
  metadataBase: new URL(
    (() => {
      const raw = (process.env.PUBLIC_BASE_URL || "").trim();
      if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
      return "https://www.serafinna.ru";
    })()
  ),
  openGraph: {
    title: "Серафинна — гостевой дом в Джубге с видом на море",
    description:
      "Снять номер у моря в Джубге: панорамный вид, парковка, Wi‑Fi. От 4 500 ₽/ночь.",
    images: ["/images/og-cover.jpg"],
    locale: "ru_RU",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href={assetHost} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={assetHost} />
        <link
          rel="preload"
          as="image"
          href={`${assetHost}/images/photo-08.jpg`}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
