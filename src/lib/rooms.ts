import { prisma } from "@/lib/db";
import {
  calcStay,
  eachNight,
  OCCUPYING_STATUSES,
  type StayResult,
} from "@/lib/pricing";

export async function loadMonthlyPrices(
  categoryId: string
): Promise<Record<number, number>> {
  const rows = await prisma.monthlyPrice.findMany({ where: { categoryId } });
  const out: Record<number, number> = {};
  for (const r of rows) out[r.month] = r.price;
  return out;
}

export async function loadStayContext(
  categoryId: string,
  checkIn: string,
  checkOut: string
) {
  const room = await prisma.room.findUnique({ where: { id: categoryId } });
  if (!room) return null;

  const nights = eachNight(checkIn, checkOut);
  const monthlyPrices = await loadMonthlyPrices(categoryId);

  const inv = await prisma.dateInventory.findMany({
    where: { categoryId, day: { in: nights } },
  });
  const inventory: Record<string, number> = {};
  for (const r of inv) inventory[r.day] = r.roomsAvailable;

  const blocks = await prisma.dateBlock.findMany({
    where: { categoryId, day: { in: nights } },
  });
  const blockedDays = new Set(blocks.map((b) => b.day));

  const bookings = await prisma.booking.findMany({
    where: {
      categoryId,
      status: { in: [...OCCUPYING_STATUSES] },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
  });

  const occupiedByNight: Record<string, number> = {};
  for (const day of nights) occupiedByNight[day] = 0;
  for (const b of bookings) {
    for (const day of eachNight(b.checkIn, b.checkOut)) {
      if (occupiedByNight[day] !== undefined) {
        occupiedByNight[day] += 1;
      }
    }
  }

  let minNights = 1;
  if (nights[0]) {
    const month = Number(nights[0].slice(5, 7));
    const rule = await prisma.minNightsRule.findFirst({
      where: {
        month,
        OR: [{ categoryId }, { categoryId: "" }],
      },
      orderBy: { categoryId: "desc" },
    });
    if (rule) minNights = rule.minNights;
  }

  const stay = calcStay({
    checkIn,
    checkOut,
    basePrice: room.price,
    totalRooms: room.totalRooms,
    inventory,
    blockedDays,
    monthlyPrices,
    occupiedByNight,
    minNights,
  });

  return { room, stay, monthlyPrices };
}

export function roomJson(
  room: {
    id: string;
    name: string;
    description: string;
    price: number;
    totalRooms: number;
    availableRooms: number;
    sortOrder: number;
  },
  stay?: StayResult | null,
  monthlyPrices?: Record<number, number>
) {
  const prices = monthlyPrices ? Object.values(monthlyPrices) : [];
  const minP = prices.length ? Math.min(...prices) : room.price;
  const maxP = prices.length ? Math.max(...prices) : room.price;
  return {
    id: room.id,
    name: room.name,
    description: room.description,
    price: room.price,
    total_rooms: room.totalRooms,
    available_rooms: room.availableRooms,
    sort_order: room.sortOrder,
    min_price: minP,
    max_price: maxP,
    price_from: stay?.avg_price ?? minP,
    can_book: stay?.can_book ?? true,
    min_available: stay?.min_available,
    total_price: stay?.total_price,
    nights: stay?.nights,
    monthly_prices: monthlyPrices ?? {},
  };
}
