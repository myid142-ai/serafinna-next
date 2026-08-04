import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { blockDates, unblockDates } from "@/lib/ops";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const categoryId = req.nextUrl.searchParams.get("category_id") || "";
  const from = req.nextUrl.searchParams.get("from") || "";
  const to = req.nextUrl.searchParams.get("to") || "";

  const where: {
    categoryId?: string;
    day?: { gte?: string; lte?: string };
  } = {};
  if (categoryId) where.categoryId = categoryId;
  if (from || to) {
    where.day = {};
    if (from) where.day.gte = from;
    if (to) where.day.lte = to;
  }

  const rows = await prisma.dateBlock.findMany({
    where,
    orderBy: [{ day: "asc" }],
    take: 200,
    include: { room: { select: { name: true } } },
  });

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      category_id: r.categoryId,
      category_name: r.room?.name || r.categoryId,
      day: r.day,
      reason: r.reason,
      note: r.note,
    }))
  );
}

const Body = z.object({
  category_id: z.string().min(1),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  action: z.enum(["block", "unblock"]).default("block"),
  reason: z.string().optional().default("closed"),
  note: z.string().optional().default(""),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Нужны category_id, date_from, date_to" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  if (d.date_to < d.date_from) {
    return NextResponse.json(
      { error: "date_to должна быть ≥ date_from" },
      { status: 400 }
    );
  }

  const room = await prisma.room.findUnique({ where: { id: d.category_id } });
  if (!room) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
  }

  const days =
    d.action === "unblock"
      ? await unblockDates(d.category_id, d.date_from, d.date_to)
      : await blockDates(
          d.category_id,
          d.date_from,
          d.date_to,
          d.reason || "closed",
          d.note || ""
        );

  return NextResponse.json({
    ok: true,
    action: d.action,
    days,
    category_id: d.category_id,
    date_from: d.date_from,
    date_to: d.date_to,
  });
}
