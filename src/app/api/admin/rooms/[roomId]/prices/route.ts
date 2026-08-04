import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ roomId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { roomId } = await ctx.params;
  const rows = await prisma.monthlyPrice.findMany({
    where: { categoryId: roomId },
    orderBy: { month: "asc" },
  });
  const prices: Record<string, number> = {};
  for (const r of rows) prices[String(r.month)] = r.price;
  return NextResponse.json({ category_id: roomId, prices });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { roomId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const prices = body.prices || body;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  for (let m = 1; m <= 12; m++) {
    const raw = prices[m] ?? prices[String(m)];
    if (raw === undefined || raw === null || raw === "") continue;
    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0) continue;
    await prisma.monthlyPrice.upsert({
      where: { categoryId_month: { categoryId: roomId, month: m } },
      create: { categoryId: roomId, month: m, price },
      update: { price },
    });
  }

  const rows = await prisma.monthlyPrice.findMany({
    where: { categoryId: roomId },
    orderBy: { month: "asc" },
  });
  const out: Record<string, number> = {};
  for (const r of rows) out[String(r.month)] = r.price;
  return NextResponse.json({ category_id: roomId, prices: out });
}
