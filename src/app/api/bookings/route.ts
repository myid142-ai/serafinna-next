import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { loadStayContext } from "@/lib/rooms";
import { normalizePhone } from "@/lib/pricing";
import { notifyNewBooking } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const Body = z.object({
  category_id: z.string().min(1),
  guest_name: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().optional().default(""),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(20).default(2),
  comment: z.string().optional().default(""),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Заполните имя, телефон, категорию и даты", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;
  if (data.check_out <= data.check_in) {
    return NextResponse.json(
      { error: "Дата выезда должна быть позже заезда" },
      { status: 400 }
    );
  }

  const ctx = await loadStayContext(
    data.category_id,
    data.check_in,
    data.check_out
  );
  if (!ctx) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
  }
  if (!ctx.stay.can_book) {
    return NextResponse.json(
      { error: ctx.stay.reason || "Нет свободных номеров", stay: ctx.stay },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const booking = await prisma.booking.create({
    data: {
      categoryId: data.category_id,
      guestName: data.guest_name.trim(),
      phone: normalizePhone(data.phone) || data.phone.trim(),
      email: (data.email || "").trim(),
      checkIn: data.check_in,
      checkOut: data.check_out,
      guests: data.guests,
      comment: (data.comment || "").trim(),
      status: "pending",
      totalPrice: ctx.stay.total_price,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.bookingHistory.create({
    data: {
      bookingId: booking.id,
      actor: "guest",
      action: "created",
      oldStatus: "",
      newStatus: "pending",
      comment: "",
      createdAt: now,
    },
  });

  let telegram: { ok: boolean; skipped?: boolean; error?: string } = {
    ok: false,
  };
  try {
    const tg = await notifyNewBooking(
      {
        id: booking.id,
        category_id: booking.categoryId,
        category_name: ctx.room.name,
        guest_name: booking.guestName,
        phone: booking.phone,
        email: booking.email,
        check_in: booking.checkIn,
        check_out: booking.checkOut,
        guests: booking.guests,
        comment: booking.comment,
        total_price: booking.totalPrice,
      },
      ctx.stay.nights
    );
    telegram = {
      ok: Boolean(tg.ok),
      skipped: tg.skipped,
      error: tg.error,
    };
  } catch (e) {
    console.error("telegram notify failed", e);
    telegram = {
      ok: false,
      error: e instanceof Error ? e.message : "telegram error",
    };
  }

  return NextResponse.json({
    id: booking.id,
    status: booking.status,
    category_id: booking.categoryId,
    category_name: ctx.room.name,
    guest_name: booking.guestName,
    phone: booking.phone,
    check_in: booking.checkIn,
    check_out: booking.checkOut,
    guests: booking.guests,
    total_price: booking.totalPrice,
    stay: ctx.stay,
    telegram,
  });
}
