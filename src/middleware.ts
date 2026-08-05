import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Ultra-light homepage: ~3–6 KB, no React, no required external assets.
 * Designed for RU LTE + VPNs (e.g. «Щука») that block or stall Vercel IPs.
 *
 * CRITICAL for those networks: turn Cloudflare DNS Proxy ON (orange cloud)
 * so visitors hit Cloudflare anycast, not Vercel origin IPs.
 *
 * /book · /full — full Next app (need Vercel path or CF cache)
 * /?app=1 — Next HomeStatic
 */
function liteHomeHtml(): string {
  const wa =
    "https://wa.me/79184092279?text=" +
    encodeURIComponent(
      "Здравствуйте! Хочу забронировать отдых в гостевом доме «Серафинна».\n" +
        "Джубга, ул. Маяковского 5А\nhttps://www.serafinna.ru/"
    );

  // No vercel.app images/fonts here — page must work even if Vercel is blocked.
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Серафинна — гостевой дом в Джубге</title>
<meta name="description" content="Гостевой дом Серафинна в Джубге: вид на море, парковка, Wi‑Fi. От 3 200 ₽. Рейтинг 4.9. WhatsApp +7 918 409-22-79"/>
<meta name="theme-color" content="#0a5c66"/>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect fill='%230a5c66' width='32' height='32' rx='8'/%3E%3Ctext x='16' y='22' text-anchor='middle' fill='white' font-size='16' font-family='system-ui'%3ES%3C/text%3E%3C/svg%3E"/>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#142426;background:#f3efe8;line-height:1.5}
a{color:#0a5c66}.wrap{max-width:640px;margin:0 auto;padding:0 1rem}
.hero{padding:2.5rem 0 2rem;background:linear-gradient(145deg,#063f47 0%,#0a5c66 45%,#1a7a6d 100%);color:#fff}
.hero h1{font-family:Georgia,ui-serif,serif;font-size:clamp(2rem,8vw,2.8rem);margin:.2rem 0;font-weight:600}
.hero p{opacity:.95;max-width:26rem;margin:.4rem 0 0}
.row{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:1.15rem}
.btn{display:inline-block;background:#25d366;color:#fff!important;text-decoration:none;padding:.8rem 1.15rem;border-radius:999px;font-weight:700;font-size:.95rem}
.btn--tel{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4)}
.btn--sec{background:#0a5c66;color:#fff!important}
.card{background:#fff;border-radius:14px;padding:1rem 1.15rem;margin:1rem 0;box-shadow:0 8px 24px rgba(8,45,52,.07)}
.muted{color:#5a6a6d;font-size:.9rem;margin:.35rem 0}
h2{font-family:Georgia,ui-serif,serif;font-weight:600;font-size:1.25rem;margin:0 0 .4rem}
.stats{display:flex;gap:1.1rem;flex-wrap:wrap;margin-top:1rem;font-size:.82rem;opacity:.95}
.stats b{display:block;font-size:1.1rem}
footer{padding:1.5rem 0 5rem;color:#5a6a6d;font-size:.82rem}
.fab{position:fixed;right:1rem;bottom:1rem;background:#25d366;color:#fff;width:3.4rem;height:3.4rem;border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;font-weight:800;font-size:.85rem;box-shadow:0 8px 22px rgba(0,0,0,.22)}
</style>
</head>
<body>
<header class="hero">
  <div class="wrap">
    <p style="margin:0;opacity:.85;font-size:.9rem">Гостевой дом · Джубга · Чёрное море</p>
    <h1>Серафинна</h1>
    <p>Дом у моря с видом на бухту. Номера, парковка, мангал. ~5 мин до пляжа.</p>
    <div class="row">
      <a class="btn" href="${wa}" target="_blank" rel="noopener">WhatsApp — бронь</a>
      <a class="btn btn--tel" href="tel:+79184092279">+7 918 409-22-79</a>
    </div>
    <div class="stats">
      <div><b>4.9</b>рейтинг</div>
      <div><b>241+</b>отзывов</div>
      <div><b>от 3200 ₽</b>ночь</div>
    </div>
  </div>
</header>
<main class="wrap">
  <div class="card">
    <h2>Связаться</h2>
    <p class="muted">Лёгкая страница для мобильного интернета и VPN. Календарь — по желанию.</p>
    <div class="row">
      <a class="btn" href="${wa}" target="_blank" rel="noopener">Написать в WhatsApp</a>
      <a class="btn btn--sec" href="tel:+79184092279">Позвонить</a>
    </div>
  </div>
  <div class="card">
    <h2>Адрес</h2>
    <p style="margin:.3rem 0">Краснодарский край, Туапсинский МО,<br/>пгт Джубга, ул. Маяковского, 5А</p>
    <p class="muted">Предоплата — 1-я ночь · остальное наличными на месте</p>
  </div>
  <div class="card">
    <h2>Номера</h2>
    <p class="muted">5 двухместных · 2 апартамента · 2 семейных</p>
    <div class="row">
      <a class="btn btn--sec" href="/book">Календарь и заявка</a>
    </div>
    <p class="muted">Не открывается? Напишите в WhatsApp — подберём даты.</p>
  </div>
</main>
<footer class="wrap">
  <p>© ${new Date().getFullYear()} Серафинна · <a href="/privacy">Политика ПДн</a></p>
</footer>
<a class="fab" href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">WA</a>
</body>
</html>`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/" || pathname === "") {
    if (request.nextUrl.searchParams.get("app") === "1") {
      return NextResponse.next();
    }
    return new NextResponse(liteHomeHtml(), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Allow Cloudflare (and browsers) to keep the tiny page
        "Cache-Control":
          "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
        "X-Serafinna-Lite": "1",
        // Help CF / intermediaries treat as immutable-ish short cache
        "CDN-Cache-Control": "public, s-maxage=3600",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
