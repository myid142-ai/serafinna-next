import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "@/styles/site.css";

const manrope = Manrope({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["cyrillic", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const assetHost = (
  process.env.NEXT_PUBLIC_ASSET_HOST || "https://serafinna.vercel.app"
).replace(/\/$/, "");

const siteUrl = (() => {
  const raw = (process.env.PUBLIC_BASE_URL || "").trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/$/, "");
  return "https://www.serafinna.ru";
})();

export const metadata: Metadata = {
  title: "Серафинна — гостевой дом в Джубге с видом на море",
  description:
    "Гостевой дом в Джубге «Серафинна»: снять номер у моря с панорамным видом. Ул. Маяковского, 5А. Парковка, Wi‑Fi. От 3 200 ₽. Рейтинг 4.9.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: siteUrl + "/",
  },
  openGraph: {
    title: "Серафинна — гостевой дом в Джубге с видом на море",
    description:
      "Снять номер у моря в Джубге: панорамный вид, парковка, Wi‑Fi. От 3 200 ₽/ночь.",
    url: siteUrl,
    siteName: "Серафинна",
    images: ["/images/og-cover.jpg"],
    locale: "ru_RU",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
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
    <html lang="ru" className={`${manrope.variable} ${cormorant.variable}`}>
      <head>
        <link rel="preconnect" href={assetHost} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={assetHost} />
        <link
          rel="preload"
          as="image"
          href={`${assetHost}/images/photo-08.jpg`}
        />
      </head>
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LodgingBusiness",
              name: "Серафинна",
              description:
                "Гостевой дом в Джубге с панорамным видом на море",
              url: siteUrl,
              telephone: "+79184092279",
              address: {
                "@type": "PostalAddress",
                streetAddress: "ул. Маяковского, 5А",
                addressLocality: "Джубга",
                addressRegion: "Краснодарский край",
                addressCountry: "RU",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: 44.306169,
                longitude: 38.70605,
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "241",
              },
              priceRange: "₽₽",
            }),
          }}
        />
      </body>
    </html>
  );
}
