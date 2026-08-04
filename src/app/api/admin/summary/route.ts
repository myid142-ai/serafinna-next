import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dailySummaryText, freeForNight } from "@/lib/ops";
import { prisma } from "@/lib/db";
import { formatYmd, OCCUPYING_STATUSES } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const today = formatYmd(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = formatYmd(tomorrowDate);

  const [checkIns, checkOuts, pending, rooms, recentPending] = await Promise.all([
    prisma.booking.count({
      where: { checkIn: today, status: { in: [...OCCUPYING_STATUSES] } },
    }),
    prisma.booking.count({
      where: {
        checkOut: today,
        status: { in: [...OCCUPYING_STATUSES, "checked_out"] },
      },
    }),
    prisma.booking.count({ where: { status: "pending" } }),
    prisma.room.findMany({
      orderBy: [{ sortOrder: "asc" }],
      select: { id: true, name: true, totalRooms: true },
    }),
    prisma.booking.findMany({
      where: { status: "pending" },
      include: { room: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const freeToday = [];
  for (const r of rooms) {
    freeToday.push({
      id: r.id,
      name: r.name,
      free: await freeForNight(r.id, today),
      total: r.totalRooms,
    });
  }

  return NextResponse.json({
    today,
    tomorrow,
    check_ins: checkIns,
    check_outs: checkOuts,
    pending,
    free_today: freeToday,
    pending_list: recentPending.map((b) => ({
      id: b.id,
      guest_name: b.guestName,
      phone: b.phone,
      category_name: b.room?.name || b.categoryId,
      check_in: b.checkIn,
      check_out: b.checkOut,
      total_price: b.totalPrice,
      created_at: b.createdAt,
    })),
    text: await dailySummaryText(),
  });
}
