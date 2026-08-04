import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadMonthlyPrices, roomJson } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const rooms = await prisma.room.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const result = [];
  for (const r of rooms) {
    const monthly = await loadMonthlyPrices(r.id);
    result.push(roomJson(r, null, monthly));
  }
  return NextResponse.json(result);
}
