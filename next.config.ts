import type { NextConfig } from "next";

const adminPath = (process.env.SERAFINNA_ADMIN_PATH || "m-panel").replace(
  /^\/+|\/+$/g,
  ""
);

/**
 * On some networks (RU / .ru path) large responses on the custom domain stall
 * mid-transfer. Serve /_next/static/* from the Vercel app host, which delivers
 * complete JS/CSS. Images already use NEXT_PUBLIC_ASSET_HOST in the landing.
 * Set NEXT_PUBLIC_ASSET_PREFIX=0 to disable.
 */
const assetHost = (
  process.env.NEXT_PUBLIC_ASSET_HOST || "https://serafinna.vercel.app"
).replace(/\/$/, "");

const useAssetPrefix =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_ASSET_PREFIX !== "0";

const nextConfig: NextConfig = {
  assetPrefix: useAssetPrefix ? assetHost : undefined,
  async rewrites() {
    return [
      { source: `/${adminPath}`, destination: "/panel" },
      { source: `/${adminPath}/:path*`, destination: "/panel/:path*" },
    ];
  },
};

export default nextConfig;
