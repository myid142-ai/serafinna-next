# Cloudflare + Vercel (быстрый фикс для VPN / «Щука»)

Цель: посетитель ходит на **IP Cloudflare**, а не на IP Vercel (которые VPN часто режет).

## 1. DNS (оранжевое облако)

В [dash.cloudflare.com](https://dash.cloudflare.com) → **serafinna.ru** → **DNS**:

| Type  | Name | Content                         | Proxy        |
|-------|------|---------------------------------|--------------|
| CNAME | www  | `cname.vercel-dns.com` или ваш `*.vercel-dns-*.com` | **Proxied** 🟠 |
| A / CNAME | @ | как в Vercel → Domains          | **Proxied** 🟠 |

Все записи сайта — **Proxied** (оранжевое), не DNS only.

Проверка через 5–15 мин:

```bash
dig +short www.serafinna.ru
# должны быть IP Cloudflare (часто 188.114.x.x / 104.x), не 64.29 / 216.198
```

## 2. SSL

**SSL/TLS** → **Overview** → **Full (strict)**  
(не Flexible — иначе будут петли/ошибки 525)

## 3. Отключить то, что ломает Next.js

| Раздел | Настройка | Значение |
|--------|-----------|----------|
| Speed → Optimization | **Rocket Loader** | **Off** |
| Speed → Optimization | Auto Minify JS | Off (лучше) |
| Scrape Shield | Email Obfuscation | Off |
| Speed | Mirage | Off |

## 4. Кэш (чтобы HTML не «висел» с origin)

**Caching** → **Configuration**:
- Browser Cache TTL: **Respect Existing Headers** (или 4 hours)

**Rules** → **Cache Rules** → Create rule:

- Name: `Cache HTML home`
- If: hostname is `www.serafinna.ru` and URI Path equals `/`
- Then: **Eligible for cache**, Edge TTL **2 hours**, Browser TTL **1 hour**

Опционально правило для `/_next/static/*` — cache everything, edge 1 month  
(но у нас JS/CSS часто грузятся с `serafinna.vercel.app` — см. ниже).

## 5. Как устроены ассеты (важно)

В проде Next отдаёт JS/CSS/фото с:

`NEXT_PUBLIC_ASSET_HOST=https://serafinna.vercel.app`  
(`assetPrefix` в `next.config.ts`)

Почему: через кастомный домен + CF раньше **обрывались большие файлы**.  
Схема:

```
Браузер → CF → Vercel  (HTML, API, /book)
Браузер → serafinna.vercel.app  (JS, CSS, images)  // напрямую
```

Если VPN режет **весь** Vercel (включая `.vercel.app`), одного Cloudflare мало — нужен **РФ VPS** (`DEPLOY.md` §2).

## 6. Проверка после включения

1. iPhone LTE + «Щука» → https://www.serafinna.ru  
2. DevTools / «Веб-инспектор» → Network: HTML 200, `server: cloudflare`  
3. JS с `serafinna.vercel.app` — status 200, полный размер  
4. Если `.vercel.app` не грузится при включённой Щуке — перенос на РФ (Docker)

## 7. Откат

DNS → **DNS only** (серое) на всех записях — снова прямой Vercel (как было).
