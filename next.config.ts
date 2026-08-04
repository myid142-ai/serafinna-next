import type { NextConfig } from "next";

const adminPath = (process.env.SERAFINNA_ADMIN_PATH || "m-panel").replace(
  /^\/+|\/+$/g,
  ""
);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: `/${adminPath}`, destination: "/panel" },
      { source: `/${adminPath}/:path*`, destination: "/panel/:path*" },
    ];
  },
};

export default nextConfig;
