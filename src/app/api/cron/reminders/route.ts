import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pendingOlderThan } from "@/lib/ops";
import {
  bookingActionKeyboard,
  formatBookingTelegram,
  sendTelegramMessage,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

function cronOk(req: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  const h = req.headers.get("x-cron-secret") || "";
  const q = req.nextUrl.searchParams.get("secret") || "";
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET> if configured
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return h === secret || q === secret || bearer === secret;
}

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  if (!cronOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pending = await pendingOlderThan(2);
  let sent = 0;
  for (const r of pending) {
    const text =
      "⏰ Напоминание: заявка без ответа > 2 часов\n\n" +
      formatBookingTelegram({
        id: r.id,
        category_name: r.room?.name,
        category_id: r.categoryId,
        guest_name: r.guestName,
        phone: r.phone,
        email: r.email,
        check_in: r.checkIn,
        check_out: r.checkOut,
        guests: r.guests,
        comment: r.comment,
        total_price: r.totalPrice,
      });
    const res = await sendTelegramMessage(
      text,
      bookingActionKeyboard(r.id)
    );
    if (res.ok) {
      await prisma.booking.update({
        where: { id: r.id },
        data: { remindedAt: new Date().toISOString() },
      });
      sent++;
    }
  }
  return NextResponse.json({
    ok: true,
    reminded: sent,
    candidates: pending.length,
  });
}
