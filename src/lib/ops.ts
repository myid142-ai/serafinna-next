/**
 * Ops helpers ported from Flask (daily summary, blocks, pending reminders).
 */
import { prisma } from "@/lib/db";
import { eachNight, formatYmd, OCCUPYING_STATUSES } from "@/lib/pricing";

const OCCUPYING_LIST = [...OCCUPYING_STATUSES];

export async function freeForNight(
  categoryId: string,
  day: string
): Promise<number> {
  const room = await prisma.room.findUnique({ where: { id: categoryId } });
  if (!room) return 0;

  const blocked = await prisma.dateBlock.findFirst({
    where: { categoryId, day },
  });
  if (blocked) return 0;

  const inv = await prisma.dateInventory.findUnique({
    where: { categoryId_day: { categoryId, day } },
  });
  const capacity =
    inv?.roomsAvailable !== undefined ? inv.roomsAvailable : room.totalRooms;

  // Occupying bookings that cover this night: checkIn <= day < checkOut
  const bookings = await prisma.booking.findMany({
    where: {
      categoryId,
      status: { in: OCCUPYING_LIST },
      checkIn: { lte: day },
      checkOut: { gt: day },
    },
    select: { id: true },
  });
  return Math.max(0, capacity - bookings.length);
}

export async function dailySummaryText(): Promise<string> {
  const today = formatYmd(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = formatYmd(tomorrowDate);

  const [checkIns, checkOuts, pending, rooms] = await Promise.all([
    prisma.booking.count({
      where: {
        checkIn: today,
        status: { in: OCCUPYING_LIST },
      },
    }),
    prisma.booking.count({
      where: {
        checkOut: today,
        status: {
          in: [...OCCUPYING_LIST, "checked_out"],
        },
      },
    }),
    prisma.booking.count({ where: { status: "pending" } }),
    prisma.room.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const freeLines: string[] = [];
  for (const r of rooms) {
    const free = await freeForNight(r.id, today);
    freeLines.push(`• ${r.name}: свободно ${free}`);
  }

  return [
    `☀️ Сводка Serafinna на ${today}`,
    "",
    `Заезд сегодня: ${checkIns}`,
    `Выезд сегодня: ${checkOuts}`,
    `Новых заявок (pending): ${pending}`,
    "",
    "Свободно на сегодня:",
    ...freeLines,
    "",
    `Завтра: ${tomorrow}`,
  ].join("\n");
}

export async function pendingOlderThan(hours = 2) {
  const cutoff = Date.now() - hours * 3600 * 1000;
  const rows = await prisma.booking.findMany({
    where: { status: "pending" },
    include: { room: true },
    orderBy: { createdAt: "asc" },
  });
  const out = [];
  for (const r of rows) {
    const created = Date.parse(r.createdAt);
    if (!Number.isFinite(created) || created > cutoff) continue;
    if (r.remindedAt) {
      const rem = Date.parse(r.remindedAt);
      if (Number.isFinite(rem) && Date.now() - rem < hours * 3600 * 1000) {
        continue;
      }
    }
    out.push(r);
  }
  return out;
}

export async function blockDates(
  categoryId: string,
  dateFrom: string,
  dateTo: string,
  reason = "closed",
  note = ""
): Promise<number> {
  const nights = eachNight(dateFrom, dateTo);
  // include dateTo as closed day if same as from for single-day close? Flask uses range
  // For closing "dates" users usually want inclusive both ends for calendar days.
  // Flask block_dates: each day from from to to inclusive - check ops
  let n = 0;
  const days = nights.length
    ? nights
    : dateFrom === dateTo
      ? [dateFrom]
      : nights;
  // If checkOut-style range was used (from < to), nights is [from, to). Add last day for "close calendar days"
  // Better: inclusive range of calendar days
  const inclusive = inclusiveDays(dateFrom, dateTo);
  for (const day of inclusive) {
    await prisma.dateBlock.upsert({
      where: { categoryId_day: { categoryId, day } },
      create: { categoryId, day, reason, note },
      update: { reason, note },
    });
    n++;
  }
  return n;
}

export async function unblockDates(
  categoryId: string,
  dateFrom: string,
  dateTo: string
): Promise<number> {
  const days = inclusiveDays(dateFrom, dateTo);
  const res = await prisma.dateBlock.deleteMany({
    where: { categoryId, day: { in: days } },
  });
  return res.count;
}

function inclusiveDays(from: string, to: string): string[] {
  if (to < from) return [];
  if (to === from) return [from];
  // eachNight is [from, to) so add to as calendar day when closing range of nights
  // For "close 10-12" meaning 10,11,12 inclusive:
  const nights = eachNight(from, to);
  const last = to;
  if (!nights.includes(last)) return [...nights, last];
  return nights;
}

export async function makeJsonBackup(): Promise<{
  createdAt: string;
  id?: number;
  bytes: number;
  payload: string;
}> {
  const now = new Date().toISOString();
  const [rooms, bookings, blocks, monthly] = await Promise.all([
    prisma.room.findMany(),
    prisma.booking.findMany({ orderBy: { id: "desc" }, take: 500 }),
    prisma.dateBlock.findMany(),
    prisma.monthlyPrice.findMany(),
  ]);
  const payload = JSON.stringify(
    {
      created_at: now,
      rooms,
      bookings,
      date_blocks: blocks,
      monthly_prices: monthly,
    },
    null,
    0
  );
  const row = await prisma.backup.create({
    data: { createdAt: now, payload },
  });
  return {
    createdAt: now,
    id: row.id,
    bytes: payload.length,
    payload,
  };
}
