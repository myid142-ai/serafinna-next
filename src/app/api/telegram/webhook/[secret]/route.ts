import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/pricing";
import {
  allowedPhones,
  bookingActionKeyboard,
  setBookingStatusFromTelegram,
  telegramApi,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ secret: string }> };

async function tgSend(chatId: string | number, text: string, extra?: object) {
  return telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    ...(extra || {}),
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { secret } = await ctx.params;
  const expected = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const update = await req.json().catch(() => ({}));
  try {
    await handleUpdate(update);
  } catch (e) {
    console.error("telegram webhook", e);
  }
  // Always 200 so Telegram stops retrying
  return NextResponse.json({ ok: true });
}

async function handleUpdate(update: Record<string, unknown>) {
  // Callback buttons on booking
  const callback = update.callback_query as
    | {
        id: string;
        data?: string;
        from?: { id: number; first_name?: string };
        message?: { chat?: { id: number }; message_id?: number };
      }
    | undefined;

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

  // Contact share → bind phone to this Telegram account
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
      await prisma.telegramSubscriber.deleteMany({ where: { chatId } }).catch(() => null);
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
    await tgSend(
      chatId,
      `✅ Номер ${phone} привязан к этому Telegram.\n\n` +
        "Сюда будут приходить заявки с сайта.\n" +
        "Панель: " +
        `${(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")}/${(process.env.SERAFINNA_ADMIN_PATH || "m-panel").replace(/^\/+|\/+$/g, "")}/`
    );
    return;
  }

  if (text.startsWith("/start") || text) {
    // check if already authorized
    const sub = await prisma.telegramSubscriber.findUnique({ where: { chatId } });
    const phone = normalizePhone(sub?.phone || "");
    if (sub && allowedPhones().has(phone)) {
      await tgSend(
        chatId,
        `Вы уже авторизованы (${phone}).\nЗаявки с сайта приходят в этот чат.`
      );
      return;
    }
    await tgSend(chatId, "Добро пожаловать в Serafinna Учёт.\n\n" +
      "Чтобы получать заявки на номер +79184092279, нажмите кнопку ниже и отправьте свой номер телефона.", {
      reply_markup: {
        keyboard: [
          [{ text: "📱 Отправить номер телефона", request_contact: true }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }
}
