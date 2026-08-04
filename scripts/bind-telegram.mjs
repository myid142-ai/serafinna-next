/**
 * Привязка Telegram к номеру владельца (локально, без публичного webhook).
 *
 * 1) Разблокируйте @serafinna_uchet_bot в Telegram
 * 2) Напишите боту /start
 * 3) Отправьте контакт (кнопка «номер») или просто любое сообщение
 * 4) Запустите: node scripts/bind-telegram.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    env[t.slice(0, i)] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

async function api(token, method, payload) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const res = await fetch(url, {
    method: payload ? "POST" : "GET",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  return res.json();
}

function normalizePhone(raw) {
  if (!raw) return "";
  let d = String(raw).replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("8")) d = "7" + d.slice(1);
  if (d.length === 10 && d.startsWith("9")) d = "7" + d;
  if (d.startsWith("7") && d.length === 11) return "+" + d;
  return d ? "+" + d : "";
}

const env = loadEnv();
const token = env.TELEGRAM_BOT_TOKEN;
const allowed = new Set(
  (env.TELEGRAM_ALLOWED_PHONES || env.TELEGRAM_OWNER_PHONE || "+79184092279")
    .split(",")
    .map(normalizePhone)
    .filter(Boolean)
);

if (!token) {
  console.error("Нет TELEGRAM_BOT_TOKEN в .env");
  process.exit(1);
}

await api(token, "deleteWebhook", { drop_pending_updates: false });
console.log("Webhook снят. Жду сообщения 25 сек…");
console.log("Сейчас: откройте @serafinna_uchet_bot → /start → «Отправить номер»");

const started = Date.now();
let bound = null;

while (Date.now() - started < 25000) {
  const upd = await api(token, "getUpdates", { timeout: 8, limit: 50 });
  for (const u of upd.result || []) {
    const msg = u.message || {};
    const chatId = msg.chat?.id;
    if (!chatId) continue;
    const phone = normalizePhone(msg.contact?.phone_number || "");
    const from = msg.from || {};
    console.log(
      "update:",
      chatId,
      from.username || from.first_name,
      phone || msg.text || ""
    );
    if (phone && allowed.has(phone)) {
      bound = { chatId: String(chatId), phone, username: from.username || "" };
    } else if (!phone && chatId) {
      // any message — candidate, but prefer contact
      if (!bound) {
        bound = {
          chatId: String(chatId),
          phone: "",
          username: from.username || "",
          pendingContact: true,
        };
      }
    }
  }
  if (bound && bound.phone) break;
  await new Promise((r) => setTimeout(r, 1000));
}

if (!bound) {
  console.error(
    "\nНе нашли сообщение.\n" +
      "1) Разблокируйте бота\n" +
      "2) Напишите /start\n" +
      "3) Отправьте свой контакт\n" +
      "4) Снова: node scripts/bind-telegram.mjs"
  );
  process.exit(1);
}

if (!bound.phone) {
  console.error(
    `\nНашли чат ${bound.chatId} (@${bound.username}), но номер не прислали.\n` +
      "Отправьте боту контакт с кнопки «номер» и запустите скрипт снова."
  );
  // still update CHAT_ID so we can try send after unblock
}

// update .env TELEGRAM_CHAT_ID
let text = readFileSync(resolve(process.cwd(), ".env"), "utf8");
if (/^TELEGRAM_CHAT_ID=/m.test(text)) {
  text = text.replace(/^TELEGRAM_CHAT_ID=.*$/m, `TELEGRAM_CHAT_ID=${bound.chatId}`);
} else {
  text = text.trimEnd() + `\nTELEGRAM_CHAT_ID=${bound.chatId}\n`;
}
writeFileSync(resolve(process.cwd(), ".env"), text);

const test = await api(token, "sendMessage", {
  chat_id: bound.chatId,
  text:
    bound.phone
      ? `✅ Привязано к ${bound.phone}\nЗаявки с сайта будут приходить сюда.`
      : `✅ CHAT_ID обновлён: ${bound.chatId}\nТеперь отправьте номер телефона боту и перезапустите привязку.`,
});

console.log("\nCHAT_ID =", bound.chatId, "phone =", bound.phone || "(не подтверждён)");
console.log("sendMessage:", test.ok ? "OK" : test.description || test);
console.log("Перезапустите: npm run dev");
if (!test.ok && String(test.description || "").includes("blocked")) {
  console.error("\n⚠️ Бот заблокирован. Разблокируйте @serafinna_uchet_bot и повторите.");
}
