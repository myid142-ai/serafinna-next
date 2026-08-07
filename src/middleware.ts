import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CORS for public APIs so the browser can fall back to serafinna.vercel.app
 * when www.serafinna.ru API path is broken (VPN / LTE).
 */
const ALLOWED_ORIGINS = new Set([
  "https://www.serafinna.ru",
  "https://serafinna.ru",
  "https://serafinna.vercel.app",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
]);

const PUBLIC_API_PREFIXES = [
  "/api/bookings",
  "/api/calendar",
  "/api/quote",
  "/api/compare",
  "/api/rooms",
  "/api/health",
];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/") || !isPublicApi(pathname)) {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "";

  if (request.method === "OPTIONS") {
    if (!allowed) {
      return new NextResponse(null, { status: 204 });
    }
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(allowed),
    });
  }

  const res = NextResponse.next();
  if (allowed) {
    for (const [k, v] of Object.entries(corsHeaders(allowed))) {
      res.headers.set(k, v);
    }
  }
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
