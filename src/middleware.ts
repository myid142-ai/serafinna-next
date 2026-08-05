import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ASSET = (
  process.env.NEXT_PUBLIC_ASSET_HOST || "https://serafinna.vercel.app"
).replace(/\/$/, "");

/**
 * Ultra-light homepage (no Next/React runtime).
 * On LTE+VPN the custom-domain path often stalls ~8–16KB bodies — a 2–3KB
 * HTML document still gets through, then CSS/photos load from vercel.app.
 *
 * Full React site: /full  ·  Booking: /book  ·  Force Next home: /?app=1
 */
function liteHomeHtml(): string {
  const hero = `${ASSET}/images/photo-08.jpg`;
  const wa =
    "https://wa.me/79184092279?text=" +
    encodeURIComponent(
      "Здравствуйте! Хочу забронировать отдых в гостевом доме «Серафинна».\nhttps://www.serafinna.ru/"
    );

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Серафинна — гостевой дом в Джубге с видом на море</title>
<meta name="description" content="Гостевой дом Серафинна в Джубге: вид на море, парковка, Wi‑Fi. От 3 200 ₽. Рейтинг 4.9."/>
<meta property="og:title" content="Серафинна — гостевой дом в Джубге"/>
<meta property="og:image" content="${ASSET}/images/og-cover.jpg"/>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="preconnect" href="${ASSET}" crossorigin/>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#142426;background:#faf7f2;line-height:1.55}
a{color:#0a5c66}img{max-width:100%;height:auto;display:block}
.wrap{max-width:720px;margin:0 auto;padding:0 1rem}
.hero{min-height:70vh;display:flex;align-items:flex-end;padding:2rem 0 2.5rem;background:linear-gradient(180deg,rgba(6,40,45,.25),rgba(6,40,45,.78)),url('${hero}') center/cover no-repeat;color:#fff}
.hero h1{font-family:Georgia,ui-serif,serif;font-size:clamp(2.2rem,8vw,3.2rem);margin:.25rem 0;font-weight:600}
.hero p{opacity:.95;max-width:28rem}
.row{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.1rem}
.btn{display:inline-block;background:#0a5c66;color:#fff;text-decoration:none;padding:.75rem 1.1rem;border-radius:999px;font-weight:600;font-size:.95rem}
.btn--ghost{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.45)}
.btn--line{background:#fff;color:#0a5c66;border:1px solid #c5d9dc}
.card{background:#fff;border-radius:16px;padding:1.1rem 1.2rem;margin:1rem 0;box-shadow:0 10px 28px rgba(8,45,52,.06)}
.muted{color:#5a6a6d;font-size:.92rem}
h2{font-family:Georgia,ui-serif,serif;font-weight:600;margin:0 0 .5rem}
.stats{display:flex;gap:1.2rem;flex-wrap:wrap;margin-top:1rem;font-size:.85rem}
.stats strong{display:block;font-size:1.15rem}
footer{padding:2rem 0 5rem;color:#5a6a6d;font-size:.85rem}
.fab{position:fixed;right:1rem;bottom:1rem;background:#25d366;color:#fff;width:3.25rem;height:3.25rem;border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.2)}
</style>
</head>
<body>
<header class="hero">
  <div class="wrap">
    <p class="muted" style="color:rgba(255,255,255,.85);margin:0">Гостевой дом · Джубга · Чёрное море</p>
    <h1>Серафинна</h1>
    <p>Тихий дом у моря. Панорамный вид на бухту, номера, парковка, мангал. ~5 мин до пляжа.</p>
    <div class="row">
      <a class="btn" href="${wa}" target="_blank" rel="noopener">WhatsApp — забронировать</a>
      <a class="btn btn--ghost" href="tel:+79184092279">Позвонить</a>
    </div>
    <div class="stats">
      <div><strong>4.9</strong>рейтинг</div>
      <div><strong>241+</strong>отзывов</div>
      <div><strong>от 3 200 ₽</strong>ночь</div>
    </div>
  </div>
</header>
<main class="wrap" style="margin-top:-1.5rem;position:relative">
  <div class="card">
    <h2>Быстрый контакт</h2>
    <p class="muted">На медленном интернете / VPN эта страница открывается специально лёгкой. Календарь — по кнопке ниже.</p>
    <div class="row">
      <a class="btn" href="${wa}" target="_blank" rel="noopener">Написать в WhatsApp</a>
      <a class="btn btn--line" href="/book">Календарь и заявка</a>
    </div>
    <p class="muted" style="margin-bottom:0;margin-top:1rem">Если календарь не открывается: <a href="${ASSET}/book">${ASSET.replace("https://","")}/book</a></p>
  </div>
  <div class="card">
    <h2>Адрес</h2>
    <p>Краснодарский край, Туапсинский МО, пгт Джубга, ул. Маяковского, 5А</p>
    <p class="muted">Предоплата — первая ночь · остальное наличными на месте</p>
  </div>
  <div class="card">
    <h2>Номера</h2>
    <p class="muted">5 двухместных · 2 апартамента · 2 семейных. Цены и свободные даты — в календаре или в WhatsApp.</p>
    <a class="btn btn--line" href="/full">Полная версия сайта (фото, отзывы)</a>
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
    // Escape hatch to the Next.js home (HomeStatic)
    if (request.nextUrl.searchParams.get("app") === "1") {
      return NextResponse.next();
    }
    return new NextResponse(liteHomeHtml(), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
        "X-Serafinna-Lite": "1",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
