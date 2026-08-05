# Перенос Serafinna на VPS в России

Цель: сайт открывается стабильнее с LTE, «Щукой» и другими VPN у гостей из РФ.

Подходит: **Timeweb, Beget, REG.RU, Selectel, FirstVDS** и т.п.  
Рекомендация: **Ubuntu 22.04/24.04**, от **1–2 GB RAM**, Docker.

База: **Neon Postgres** можно оставить (уже есть) или поднять Postgres на том же VPS.

---

## 0. Подготовка

На сервере:

```bash
ssh root@ВАШ_IP
apt update && apt install -y docker.io docker-compose-v2 git nginx certbot python3-certbot-nginx
systemctl enable --now docker
```

Клонируйте репозиторий:

```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/myid142-ai/serafinna-next.git serafinna
cd serafinna
```

---

## 1. Переменные окружения

```bash
cp .env.example .env.production
nano .env.production
```

Обязательно:

```env
DATABASE_URL=postgresql://...   # Neon или локальный Postgres
PUBLIC_BASE_URL=https://www.serafinna.ru
SERAFINNA_ADMIN_USER=admin
SERAFINNA_ADMIN_PASS=...сильный...
SERAFINNA_ADMIN_PATH=m-panel
SERAFINNA_SECRET=...длинная_случайная_строка...

# На VPS всё с одного домена — без split на vercel.app
NEXT_PUBLIC_ASSET_PREFIX=0
# NEXT_PUBLIC_ASSET_HOST=   # пусто

TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
TELEGRAM_WEBHOOK_SECRET=...
CRON_SECRET=...
```

Схема БД:

```bash
export $(grep -v '^#' .env.production | xargs)
npx prisma db push
# при необходимости: npx tsx prisma/seed.ts
```

(Если Node не установлен на хосте — выполните `db push` из одноразового контейнера, см. ниже.)

```bash
docker run --rm --env-file .env.production -v "$PWD:/app" -w /app node:22-bookworm \
  bash -c "npm ci && npx prisma db push"
```

---

## 2. Запуск приложения

```bash
cd /var/www/serafinna
docker compose up -d --build
curl -sS http://127.0.0.1:3000/api/health
```

Обновление после `git pull`:

```bash
cd /var/www/serafinna
git pull
docker compose up -d --build
```

---

## 3. Nginx + HTTPS

```bash
cp deploy/nginx.conf /etc/nginx/sites-available/serafinna.ru
# раскомментируйте ssl-пути после certbot или используйте:
certbot --nginx -d serafinna.ru -d www.serafinna.ru
nginx -t && systemctl reload nginx
```

---

## 4. DNS

### Вариант A — без Cloudflare (просто)

| Type | Name | Content        |
|------|------|----------------|
| A    | @    | IP_ВАШЕГО_VPS  |
| A    | www  | IP_ВАШЕГО_VPS  |

### Вариант B — Cloudflare + VPS (рекомендуется)

| Type | Name | Content       | Proxy        |
|------|------|---------------|--------------|
| A    | @    | IP_VPS        | **Proxied** 🟠 |
| A    | www  | IP_VPS        | **Proxied** 🟠 |

SSL в Cloudflare: **Full (strict)**  
Rocket Loader: **Off**

Так гости ходят на CF → ваш сервер в РФ (или VPS EU, но РФ обычно лучше для Щуки).

---

## 5. Vercel после переноса

1. В Vercel → Domains: **уберите** `serafinna.ru` / `www` (чтобы SSL/DNS не конфликтовали).  
2. Оставьте `serafinna.vercel.app` как стейдж/бэкап (опционально).  
3. Cron: вместо Vercel Cron — `crontab` на VPS:

```cron
0 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://www.serafinna.ru/api/cron/reminders
0 5 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://www.serafinna.ru/api/cron/daily-summary
```

(Проверьте, как именно авторизуется cron в `src/app/api/cron/*`.)

---

## 6. Telegram webhook

После смены URL:

```bash
# пример
curl "https://api.telegram.org/bot$TOKEN/setWebhook?url=https://www.serafinna.ru/api/telegram/webhook/$SECRET"
```

Или `node scripts/bind-telegram.mjs` с обновлённым `PUBLIC_BASE_URL`.

---

## 7. Проверка

- https://www.serafinna.ru — полный сайт  
- LTE + VPN (Щука)  
- Админка `/m-panel` (или ваш `SERAFINNA_ADMIN_PATH`)  
- Календарь, заявка, закрытие N номеров  

---

## Если мало RAM (1 GB)

```bash
# в docker-compose можно добавить
# environment:
#   NODE_OPTIONS: --max-old-space-size=512
```

Или собирать образ на CI / локально и `docker load` на сервер.
