import type { Metadata } from "next";
import "@/styles/site.css";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
