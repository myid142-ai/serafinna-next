import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadMonthlyPrices, roomJson } from "@/lib/rooms";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ roomId: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { roomId } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const price = Number(body.price ?? room.price);
  const totalRooms = Number(body.total_rooms ?? room.totalRooms);
  let availableRooms = Number(body.available_rooms ?? room.availableRooms);

  if (
    !Number.isFinite(price) ||
    !Number.isFinite(totalRooms) ||
    !Number.isFinite(availableRooms) ||
    price < 0 ||
    totalRooms < 0 ||
    availableRooms < 0
  ) {
    return NextResponse.json({ error: "Некорректные числа" }, { status: 400 });
  }
  if (availableRooms > totalRooms) availableRooms = totalRooms;

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: { price, totalRooms, availableRooms },
  });
  const monthly = await loadMonthlyPrices(roomId);
  return NextResponse.json(roomJson(updated, null, monthly));
}
