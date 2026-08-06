import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    (process.env.PUBLIC_BASE_URL || "https://www.serafinna.ru").replace(
      /\/$/,
      ""
    ) || "https://www.serafinna.ru";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/panel", "/m-panel", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
