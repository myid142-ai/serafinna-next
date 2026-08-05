# Serafinna — Next.js

Гостевой дом: витрина, бронирование, админка, Telegram.

## Стек

- Next.js (App Router) + TypeScript
- Prisma + Postgres (Neon / любой)
- iron-session (админка)

## Деплой и VPN / телефон

Чтобы сайт стабильно открывался с LTE и VPN («Щука»):

1. **Сейчас:** [Cloudflare + Vercel](./deploy/cloudflare.md) — оранжевое облако  
2. **Надёжно:** [VPS в РФ + Docker](./deploy/vps-ru.md)  
3. Обзор: **[DEPLOY.md](./DEPLOY.md)**

```bash
# РФ VPS
cp .env.example .env.production   # NEXT_PUBLIC_ASSET_PREFIX=0
docker compose up -d --build
```

## Быстрый старт

```bash
cd ~/Desktop/сайты\ /serafinna-next
cp .env.example .env   # DATABASE_URL="file:./dev.db"
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

Открой http://127.0.0.1:3000

## API (уже есть)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | health + db |
| GET | `/api/rooms` | категории (+ optional dates) |
| GET | `/api/quote` | расчёт проживания |
| POST | `/api/bookings` | заявка `pending` |

## Админка

```
http://127.0.0.1:3000/m-panel
```

Логин/пароль — из `.env` (`SERAFINNA_ADMIN_USER` / `SERAFINNA_ADMIN_PASS`).  
Локально также пишется в `.admin_local.txt` (не коммитить).

Вкладки: **Заявки** · **Номера** · **Цены по месяцам**.

## Roadmap

1. ~~Scaffold + schema + seed~~  
2. ~~Public APIs + landing MVP~~  
3. ~~Admin (iron-session, prices, bookings)~~  
4. Telegram bot + finance  
5. Cron, Neon prod, Vercel, cutover domain  

Старый Flask на Render остаётся fallback до cutover.

## Prod DB

В `prisma/schema.prisma` смените `provider` на `postgresql` и задайте Neon `DATABASE_URL`.
