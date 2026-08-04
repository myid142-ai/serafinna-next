# Serafinna — Next.js

Полный перенос с Flask. **MVP (Phase 0–2 in progress):** витрина + public API + SQLite/Neon.

## Стек

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + SQLite (local) / Neon Postgres (prod)
- iron-session (admin — next phase)

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
