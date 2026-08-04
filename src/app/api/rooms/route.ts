import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loadMonthlyPrices, loadStayContext, roomJson } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const checkIn = req.nextUrl.searchParams.get("check_in") || "";
  const checkOut = req.nextUrl.searchParams.get("check_out") || "";
  const rooms = await prisma.room.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const result = [];
  for (const room of rooms) {
    const monthly = await loadMonthlyPrices(room.id);
    let stay = null;
    if (checkIn && checkOut && checkOut > checkIn) {
      const ctx = await loadStayContext(room.id, checkIn, checkOut);
      stay = ctx?.stay ?? null;
    }
    result.push(roomJson(room, stay, monthly));
  }
  return NextResponse.json(result);
}
