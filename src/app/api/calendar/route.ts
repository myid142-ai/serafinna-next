import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eachNight, OCCUPYING_STATUSES } from "@/lib/pricing";
import { loadMonthlyPrices } from "@/lib/rooms";

export const dynamic = "force-dynamic";

/**
 * Fast month calendar: few DB queries total (not N×loadStayContext).
 */
export async function GET(req: NextRequest) {
  try {
    const today = new Date();
    const year = Number(
      req.nextUrl.searchParams.get("year") || today.getFullYear()
    );
    const month = Number(
      req.nextUrl.searchParams.get("month") || today.getMonth() + 1
    );
    if (!Number.isFinite(year) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Некорректный год/месяц" },
        { status: 400 }
      );
    }

    const rooms = await prisma.room.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, totalRooms: true, price: true },
    });
    if (!rooms.length) {
      return NextResponse.json({ error: "Нет категорий" }, { status: 404 });
    }

    let categoryId = req.nextUrl.searchParams.get("category_id") || "";
    if (!categoryId) categoryId = rooms[0].id;
    const room = rooms.find((r) => r.id === categoryId);
    if (!room) {
      return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEndDay = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    // nights in month need bookings that overlap [monthStart, day after last]
    const rangeEnd = new Date(year, month - 1, daysInMonth + 1);
    const rangeEndIso = `${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, "0")}-${String(rangeEnd.getDate()).padStart(2, "0")}`;

    const [monthlyPrices, invRows, blockRows, bookings] = await Promise.all([
      loadMonthlyPrices(categoryId),
      prisma.dateInventory.findMany({
        where: {
          categoryId,
          day: { gte: monthStart, lte: monthEndDay },
        },
      }),
      prisma.dateBlock.findMany({
        where: {
          categoryId,
          day: { gte: monthStart, lte: monthEndDay },
        },
      }),
      prisma.booking.findMany({
        where: {
          categoryId,
          status: { in: [...OCCUPYING_STATUSES] },
          checkIn: { lt: rangeEndIso },
          checkOut: { gt: monthStart },
        },
        select: { checkIn: true, checkOut: true },
      }),
    ]);

    const inventory: Record<string, number> = {};
    for (const r of invRows) inventory[r.day] = r.roomsAvailable;

    const blocked = new Set(blockRows.map((b) => b.day));

    const occupied: Record<string, number> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const day = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      occupied[day] = 0;
    }
    for (const b of bookings) {
      for (const night of eachNight(b.checkIn, b.checkOut)) {
        if (occupied[night] !== undefined) occupied[night] += 1;
      }
    }

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const day = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const capacity =
        inventory[day] !== undefined ? inventory[day] : room.totalRooms;
      const isBlocked = blocked.has(day);
      const free = isBlocked
        ? 0
        : Math.max(0, capacity - (occupied[day] || 0));
      const m = month;
      const price = monthlyPrices[m] ?? room.price;
      let status: "free" | "partial" | "busy" = "free";
      if (capacity <= 0 || free <= 0 || isBlocked) status = "busy";
      else if (free < capacity) status = "partial";
      days.push({ day, free, capacity, price, status });
    }

    // Mon=0 … Sun=6
    const jsDow = new Date(year, month - 1, 1).getDay();
    const first_weekday = (jsDow + 6) % 7;

    return NextResponse.json({
      category_id: categoryId,
      category_name: room.name,
      year,
      month,
      days,
      first_weekday,
      categories: rooms.map((r) => ({ id: r.id, name: r.name })),
    });
  } catch (e) {
    console.error("calendar error", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Ошибка календаря",
      },
      { status: 500 }
    );
  }
}
