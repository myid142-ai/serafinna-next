import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/pricing";

function botToken(): string {
  return (process.env.TELEGRAM_BOT_TOKEN || "").trim();
}

function botTitle(): string {
  return (process.env.TELEGRAM_BOT_TITLE || "Serafinna Учёт").trim();
}

function publicBase(): string {
  return (process.env.PUBLIC_BASE_URL || "http://127.0.0.1:3000").replace(
    /\/$/,
    ""
  );
}

function adminPath(): string {
  return (process.env.SERAFINNA_ADMIN_PATH || "m-panel").replace(/^\/+|\/+$/g, "");
}

export function allowedPhones(): Set<string> {
  const raw =
    process.env.TELEGRAM_ALLOWED_PHONES ||
    process.env.TELEGRAM_OWNER_PHONE ||
    "+79184092279";
  const set = new Set<string>();
  for (const part of raw.split(",")) {
    const n = normalizePhone(part);
    if (n) set.add(n);
  }
  const owner = normalizePhone(process.env.TELEGRAM_OWNER_PHONE || "");
  if (owner) set.add(owner);
  return set;
}

export async function telegramApi(
  method: string,
  payload?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const token = botToken();
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN не задан" };

  const url = `https://api.telegram.org/bot${token}/${method}`;
  try {
    const res = await fetch(url, {
      method: payload ? "POST" : "GET",
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const data = (await res.json()) as Record<string, unknown>;
    return data;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function recipientChatIds(): Promise<string[]> {
  const allowed = allowedPhones();
  // Prefer chats that shared allowed phone (bound to +79184092279)
  const subs = await prisma.telegramSubscriber.findMany({
    orderBy: { createdAt: "asc" },
  });
  const fromDb = subs
    .filter((s) => allowed.has(normalizePhone(s.phone)))
    .map((s) => String(s.chatId));
  if (fromDb.length) return [...new Set(fromDb)];

  // Fallback only if nobody verified phone yet
  const envIds = (process.env.TELEGRAM_CHAT_ID || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(envIds)];
}

export function bookingActionKeyboard(bookingId: number) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Подтвердить", callback_data: `bk:ok:${bookingId}` },
        { text: "❌ Отклонить", callback_data: `bk:no:${bookingId}` },
      ],
      [
        { text: "💳 Предоплата", callback_data: `bk:pay:${bookingId}` },
        { text: "✔️ Оплачено", callback_data: `bk:paid:${bookingId}` },
      ],
    ],
  };
}

export function formatBookingTelegram(booking: {
  id: number;
  category_name?: string;
  category_id?: string;
  guest_name: string;
  phone: string;
  email?: string;
  check_in: string;
  check_out: string;
  guests: number;
  comment?: string;
  total_price?: number;
}, nights?: number): string {
  const total = booking.total_price || 0;
  const panel = `${publicBase()}/${adminPath()}/`;
  const lines = [
    `🏠 Новая заявка — ${botTitle()}`,
    "",
    `№${booking.id} · ${booking.category_name || booking.category_id}`,
    `👤 ${booking.guest_name}`,
    `📞 ${booking.phone}`,
  ];
  if (booking.email) lines.push(`✉️ ${booking.email}`);
  lines.push(
    `📅 ${booking.check_in} → ${booking.check_out}` +
      (nights ? ` (${nights} ноч.)` : ""),
    `👥 Гостей: ${booking.guests}`,
    `💰 Сумма: ${Math.round(total).toLocaleString("ru-RU")} ₽`
  );
  if (booking.comment) lines.push(`💬 ${booking.comment}`);
  lines.push(
    "",
    "👇 Кнопки: Подтвердить / Отклонить / Предоплата / Оплачено",
    `Панель: ${panel}`
  );
  return lines.join("\n");
}

export async function sendTelegramMessage(
  text: string,
  replyMarkup?: Record<string, unknown>
): Promise<{ ok: boolean; skipped?: boolean; error?: string; results?: unknown[] }> {
  const token = botToken();
  const chats = await recipientChatIds();
  if (!token) {
    return { ok: false, skipped: true, error: "TELEGRAM_BOT_TOKEN не задан" };
  }
  if (!chats.length) {
    return {
      ok: false,
      skipped: true,
      error:
        "Нет получателей. Задайте TELEGRAM_CHAT_ID или откройте бота и отправьте номер.",
    };
  }

  const results = [];
  let okAny = false;
  let lastError = "";
  for (const chatId of chats) {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    const res = await telegramApi("sendMessage", payload);
    results.push({ chat_id: chatId, response: res });
    if (res.ok) okAny = true;
    else {
      lastError =
        String(res.description || res.error || "sendMessage failed");
      console.warn("Telegram send failed", chatId, res);
    }
  }
  return {
    ok: okAny,
    results,
    error: okAny
      ? undefined
      : lastError || "Не удалось отправить в Telegram",
  };
}

export async function notifyNewBooking(booking: {
  id: number;
  category_name: string;
  category_id: string;
  guest_name: string;
  phone: string;
  email?: string;
  check_in: string;
  check_out: string;
  guests: number;
  comment?: string;
  total_price: number;
}, nights?: number) {
  const text = formatBookingTelegram(booking, nights);
  return sendTelegramMessage(text, bookingActionKeyboard(booking.id));
}

/** For Telegram inline buttons — wraps booking status machine */
export async function setBookingStatusFromTelegram(
  bookingId: number,
  status: string,
  actor: string
): Promise<{ ok: boolean; error?: string; text?: string }> {
  const { setBookingStatus } = await import("@/lib/bookings");
  const result = await setBookingStatus(bookingId, status, actor, "");
  if ("error" in result) {
    return { ok: false, error: result.error };
  }
  const b = result.booking;
  return {
    ok: true,
    text:
      `Заявка №${b.id}: ${b.status}\n` +
      `${b.guest_name} · ${b.category_name}\n` +
      `${b.check_in} → ${b.check_out}`,
  };
}
