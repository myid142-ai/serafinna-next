import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loadMonthlyPrices, loadStayContext } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const checkIn = req.nextUrl.searchParams.get("check_in") || "";
  const checkOut = req.nextUrl.searchParams.get("check_out") || "";
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return NextResponse.json(
      { error: "Нужны check_in и check_out" },
      { status: 400 }
    );
  }

  const rooms = await prisma.room.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const categories = [];
  for (const room of rooms) {
    const ctx = await loadStayContext(room.id, checkIn, checkOut);
    const monthly = await loadMonthlyPrices(room.id);
    const prices = Object.values(monthly);
    const minPrice = prices.length ? Math.min(...prices) : room.price;
    categories.push({
      id: room.id,
      name: room.name,
      min_price: minPrice,
      price_label: `от ${minPrice.toLocaleString("ru-RU")} ₽`,
      ...(ctx?.stay || {}),
    });
  }
  categories.sort((a, b) => {
    const af = a.can_book ? 0 : 1;
    const bf = b.can_book ? 0 : 1;
    if (af !== bf) return af - bf;
    return (a.total_price || 1e12) - (b.total_price || 1e12);
  });
  return NextResponse.json({
    check_in: checkIn,
    check_out: checkOut,
    nights: categories[0]?.nights || 0,
    categories,
  });
}
