import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/pricing";
import {
  blockDates,
  dailySummaryText,
  unblockDates,
} from "@/lib/ops";
import {
  allowedPhones,
  bookingActionKeyboard,
  mainOwnerKeyboard,
  setBookingStatusFromTelegram,
  telegramApi,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ secret: string }> };

type ChatState = {
  state: string;
  data: Record<string, string>;
};

async function tgSend(chatId: string | number, text: string, extra?: object) {
  return telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    ...(extra || {}),
  });
}

async function getState(chatId: string): Promise<ChatState> {
  const row = await prisma.botChatState.findUnique({ where: { chatId } });
  if (!row) return { state: "", data: {} };
  let data: Record<string, string> = {};
  try {
    data = JSON.parse(row.data || "{}") as Record<string, string>;
  } catch {
    data = {};
  }
  return { state: row.state || "", data };
}

async function setState(
  chatId: string,
  state: string,
  data: Record<string, string> = {}
) {
  const now = new Date().toISOString();
  await prisma.botChatState.upsert({
    where: { chatId },
    create: {
      chatId,
      state,
      data: JSON.stringify(data),
      updatedAt: now,
    },
    update: {
      state,
      data: JSON.stringify(data),
      updatedAt: now,
    },
  });
}

async function clearState(chatId: string) {
  await setState(chatId, "", {});
}

async function isAuthorized(chatId: string): Promise<boolean> {
  const sub = await prisma.telegramSubscriber.findUnique({ where: { chatId } });
  if (!sub) return false;
  return allowedPhones().has(normalizePhone(sub.phone));
}

function ymdOk(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { secret } = await ctx.params;
  const expected = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const update = await req.json().catch(() => ({}));
  try {
    await handleUpdate(update as Record<string, unknown>);
  } catch (e) {
    console.error("telegram webhook", e);
  }
  return NextResponse.json({ ok: true });
}

async function handleUpdate(update: Record<string, unknown>) {
  const callback = update.callback_query as
    | {
        id: string;
        data?: string;
        from?: { id: number; first_name?: string };
        message?: { chat?: { id: number }; message_id?: number };
      }
    | undefined;

  // Booking status buttons
  if (callback?.data?.startsWith("bk:")) {
    const parts = callback.data.split(":");
    const action = parts[1];
    const bookingId = Number(parts[2]);
    const chatId = callback.message?.chat?.id;
    if (!chatId || !Number.isFinite(bookingId)) return;

    const map: Record<string, string> = {
      ok: "confirmed",
      no: "rejected",
      pay: "awaiting_payment",
      paid: "paid",
    };
    const status = map[action];
    if (!status) return;

    const actor = callback.from?.first_name || "telegram";
    const result = await setBookingStatusFromTelegram(bookingId, status, actor);
    await telegramApi("answerCallbackQuery", {
      callback_query_id: callback.id,
      text: result.ok ? `Статус: ${status}` : result.error || "Ошибка",
      show_alert: !result.ok,
    });
    if (result.ok && callback.message?.message_id) {
      await telegramApi("editMessageText", {
        chat_id: chatId,
        message_id: callback.message.message_id,
        text: result.text || `Заявка №${bookingId}: ${status}`,
      });
    }
    return;
  }

  // Room pick for close/open
  if (callback?.data?.startsWith("room:")) {
    const chatId = callback.message?.chat?.id;
    if (!chatId) return;
    const cid = String(chatId);
    if (!(await isAuthorized(cid))) {
      await telegramApi("answerCallbackQuery", {
        callback_query_id: callback.id,
        text: "Нет доступа",
        show_alert: true,
      });
      return;
    }
    const [, mode, roomId] = callback.data.split(":");
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || (mode !== "close" && mode !== "open")) {
      await telegramApi("answerCallbackQuery", {
        callback_query_id: callback.id,
        text: "Не найдено",
      });
      return;
    }
    await setState(cid, mode === "close" ? "close_from" : "open_from", {
      categoryId: roomId,
      categoryName: room.name,
    });
    await telegramApi("answerCallbackQuery", {
      callback_query_id: callback.id,
      text: room.name,
    });
    await tgSend(
      chatId,
      `${mode === "close" ? "🚫 Закрыть" : "🔓 Открыть"}: ${room.name}\n\n` +
        "Введите дату начала (ГГГГ-ММ-ДД), например 2026-08-10\n" +
        "Или /cancel для отмены."
    );
    return;
  }

  const msg = (update.message || update.edited_message) as
    | {
        chat?: { id: number };
        from?: { id: number; username?: string; first_name?: string };
        text?: string;
        contact?: { phone_number?: string; user_id?: number };
      }
    | undefined;
  if (!msg?.chat?.id) return;

  const chatId = String(msg.chat.id);
  const text = (msg.text || "").trim();
  const user = msg.from ?? {
    id: 0,
    username: undefined as string | undefined,
    first_name: undefined as string | undefined,
  };

  // Contact share → bind phone
  if (msg.contact?.phone_number) {
    if (msg.contact.user_id && msg.contact.user_id !== user.id) {
      await tgSend(
        chatId,
        "Нужно отправить именно свой номер (кнопка «Отправить номер»)."
      );
      return;
    }
    const phone = normalizePhone(msg.contact.phone_number);
    if (!allowedPhones().has(phone)) {
      await prisma.telegramSubscriber
        .deleteMany({ where: { chatId } })
        .catch(() => null);
      await tgSend(
        chatId,
        "⛔ Доступ только для владельца +79184092279.\nЭтот номер не в списке."
      );
      return;
    }
    const now = new Date().toISOString();
    await prisma.telegramSubscriber.upsert({
      where: { chatId },
      create: {
        chatId,
        phone,
        username: user.username || "",
        firstName: user.first_name || "",
        createdAt: now,
        updatedAt: now,
      },
      update: {
        phone,
        username: user.username || "",
        firstName: user.first_name || "",
        updatedAt: now,
      },
    });
    await clearState(chatId);
    await tgSend(
      chatId,
      `✅ Номер ${phone} привязан.\n\n` +
        "Сюда приходят заявки с сайта, утренние сводки и напоминания.\n" +
        "Кнопки меню — внизу.",
      { reply_markup: mainOwnerKeyboard() }
    );
    return;
  }

  const authorized = await isAuthorized(chatId);

  if (!authorized) {
    if (text.startsWith("/start") || text) {
      await tgSend(
        chatId,
        "Добро пожаловать в Serafinna Учёт.\n\n" +
          "Чтобы получать заявки и сводки, нажмите кнопку и отправьте номер +79184092279.",
        {
          reply_markup: {
            keyboard: [
              [{ text: "📱 Отправить номер телефона", request_contact: true }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
    }
    return;
  }

  // --- authorized owner ---
  if (text === "/cancel" || text === "❌ Отмена") {
    await clearState(chatId);
    await tgSend(chatId, "Отменено.", { reply_markup: mainOwnerKeyboard() });
    return;
  }

  // conversation states for close/open
  const st = await getState(chatId);
  if (st.state === "close_from" || st.state === "open_from") {
    if (!ymdOk(text)) {
      await tgSend(chatId, "Формат даты: ГГГГ-ММ-ДД (например 2026-08-10)");
      return;
    }
    await setState(chatId, st.state === "close_from" ? "close_to" : "open_to", {
      ...st.data,
      from: text,
    });
    await tgSend(
      chatId,
      `Дата начала: ${text}\nВведите дату конца (ГГГГ-ММ-ДД), включительно.\n` +
        "Можно ту же дату — один день. /cancel — отмена."
    );
    return;
  }
  if (st.state === "close_to" || st.state === "open_to") {
    if (!ymdOk(text)) {
      await tgSend(chatId, "Формат даты: ГГГГ-ММ-ДД");
      return;
    }
    const from = st.data.from || "";
    const to = text;
    if (to < from) {
      await tgSend(chatId, "Дата конца должна быть ≥ начала.");
      return;
    }
    const cat = st.data.categoryId || "";
    const name = st.data.categoryName || cat;
    try {
      if (st.state === "close_to") {
        const n = await blockDates(cat, from, to, "closed", "telegram");
        await clearState(chatId);
        await tgSend(
          chatId,
          `🚫 Закрыто: ${name}\n${from} → ${to}\nДней: ${n}`,
          { reply_markup: mainOwnerKeyboard() }
        );
      } else {
        const n = await unblockDates(cat, from, to);
        await clearState(chatId);
        await tgSend(
          chatId,
          `🔓 Открыто: ${name}\n${from} → ${to}\nСнято блоков: ${n}`,
          { reply_markup: mainOwnerKeyboard() }
        );
      }
    } catch (e) {
      await tgSend(
        chatId,
        `Ошибка: ${e instanceof Error ? e.message : "unknown"}`
      );
    }
    return;
  }

  // menu commands
  if (
    text === "☀️ Сводка" ||
    text === "/summary" ||
    text === "/сводка" ||
    text.toLowerCase() === "сводка"
  ) {
    const sum = await dailySummaryText();
    await tgSend(chatId, sum, { reply_markup: mainOwnerKeyboard() });
    return;
  }

  if (text === "🛏️ Брони" || text === "/bookings") {
    const pending = await prisma.booking.findMany({
      where: { status: "pending" },
      include: { room: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    if (!pending.length) {
      await tgSend(chatId, "Нет заявок в статусе pending.", {
        reply_markup: mainOwnerKeyboard(),
      });
      return;
    }
    await tgSend(chatId, `Pending заявок: ${pending.length} (последние 10):`);
    for (const b of pending) {
      const body =
        `№${b.id} · ${b.room?.name || b.categoryId}\n` +
        `👤 ${b.guestName} · ${b.phone}\n` +
        `📅 ${b.checkIn} → ${b.checkOut}\n` +
        `💰 ${b.totalPrice} ₽`;
      await tgSend(chatId, body, {
        reply_markup: bookingActionKeyboard(b.id),
      });
    }
    return;
  }

  if (text === "🚫 Закрыть номера" || text === "/close") {
    const rooms = await prisma.room.findMany({
      orderBy: [{ sortOrder: "asc" }],
    });
    await tgSend(chatId, "Какую категорию закрыть?", {
      reply_markup: {
        inline_keyboard: rooms.map((r) => [
          { text: r.name, callback_data: `room:close:${r.id}` },
        ]),
      },
    });
    return;
  }

  if (text === "🔓 Открыть номера" || text === "/open") {
    const rooms = await prisma.room.findMany({
      orderBy: [{ sortOrder: "asc" }],
    });
    await tgSend(chatId, "Какую категорию открыть (снять блокировки)?", {
      reply_markup: {
        inline_keyboard: rooms.map((r) => [
          { text: r.name, callback_data: `room:open:${r.id}` },
        ]),
      },
    });
    return;
  }

  if (text === "ℹ️ Помощь" || text === "/help" || text.startsWith("/start")) {
    await tgSend(
      chatId,
      "Serafinna Учёт — меню:\n\n" +
        "☀️ Сводка — заезд/выезд/свободно (и утром по cron)\n" +
        "🛏️ Брони — pending заявки с кнопками\n" +
        "🚫 Закрыть номера — блок дат в календаре\n" +
        "🔓 Открыть номера — снять блоки\n\n" +
        "Заявки с сайта приходят сюда автоматически.\n" +
        "/cancel — отменить ввод дат.",
      { reply_markup: mainOwnerKeyboard() }
    );
    return;
  }

  // any other text
  await tgSend(
    chatId,
    "Команда не распознана. Нажмите ℹ️ Помощь или кнопку меню.",
    { reply_markup: mainOwnerKeyboard() }
  );
}
