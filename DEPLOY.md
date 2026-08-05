# Serafinna — доступность с VPN / телефона

Два параллельных пути. Можно сделать **сначала Cloudflare (1–2 часа)**, потом **VPS в РФ (1 вечер)**.

| Путь | Зачем | Сложность | Эффект |
|------|--------|-----------|--------|
| **A. Cloudflare + Vercel** | Гости не ходят на IP Vercel | Низкая | Часто чинит «Щуку» |
| **B. VPS в России + Docker** | Сервер «рядом» с гостями | Средняя | Максимальная стабильность |
| **A + B** | CF перед РФ-сервером | Средняя | Лучший вариант |

Подробности:

- [deploy/cloudflare.md](./deploy/cloudflare.md) — оранжевое облако, SSL, Rocket Loader  
- [deploy/vps-ru.md](./deploy/vps-ru.md) — Docker, Nginx, DNS, cron  

---

## Сейчас на Vercel (как работает код)

- HTML/API: `www.serafinna.ru` → Vercel  
- JS/CSS/фото: `serafinna.vercel.app` (`assetPrefix`, `NEXT_PUBLIC_ASSET_HOST`)  
  чтобы большие файлы не рвались на кастомном домене  

На **VPS** выставьте:

```env
NEXT_PUBLIC_ASSET_PREFIX=0
```

тогда всё с одного домена.

---

## Чеклист «оба»

### Сегодня (Cloudflare)

- [ ] DNS: **Proxied** 🟠 для `@` и `www`  
- [ ] SSL **Full (strict)**  
- [ ] Rocket Loader **Off**  
- [ ] Проверка: LTE + Щука → сайт открывается  
- [ ] Если `serafinna.vercel.app` тоже мёртв при VPN → срочно путь B  

### На неделе (VPS РФ)

- [ ] Аренда VPS (Timeweb / Beget / Selectel, Ubuntu)  
- [ ] `docker compose up -d --build`  
- [ ] Nginx + Let's Encrypt  
- [ ] DNS A → IP VPS (желательно через CF Proxied)  
- [ ] Убрать домен из Vercel  
- [ ] Webhook Telegram + cron на VPS  

---

## Быстрые ссылки

| Что | URL |
|-----|-----|
| Прод | https://www.serafinna.ru |
| Зеркало Vercel | https://serafinna.vercel.app |
| Админка | `/` + `SERAFINNA_ADMIN_PATH` (по умолчанию `m-panel`) |
| Health | `/api/health` |
