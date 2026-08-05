import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { clearInventoryDates, setInventoryDates } from "@/lib/ops";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** List inventory overrides (limited capacity per day). */
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

  const rows = await prisma.dateInventory.findMany({
    where,
    orderBy: [{ day: "asc" }],
    take: 400,
    include: { room: { select: { name: true, totalRooms: true } } },
  });

  return NextResponse.json(
    rows.map((r) => ({
      category_id: r.categoryId,
      category_name: r.room?.name || r.categoryId,
      day: r.day,
      rooms_available: r.roomsAvailable,
      total_rooms: r.room?.totalRooms ?? null,
      closed_rooms:
        r.room != null
          ? Math.max(0, r.room.totalRooms - r.roomsAvailable)
          : null,
    }))
  );
}

const Body = z.object({
  category_id: z.string().min(1),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** How many rooms stay sellable (0 … totalRooms). */
  rooms_available: z.number().int().min(0).optional(),
  /** Alternative: how many rooms to close off sale. */
  close_count: z.number().int().min(0).optional(),
  action: z.enum(["set", "clear"]).default("set"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Нужны category_id, date_from, date_to и rooms_available (или close_count)",
      },
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

  if (d.action === "clear") {
    const days = await clearInventoryDates(
      d.category_id,
      d.date_from,
      d.date_to
    );
    return NextResponse.json({
      ok: true,
      action: "clear",
      days,
      category_id: d.category_id,
      rooms_available: room.totalRooms,
    });
  }

  let available: number;
  if (d.rooms_available !== undefined) {
    available = d.rooms_available;
  } else if (d.close_count !== undefined) {
    available = Math.max(0, room.totalRooms - d.close_count);
  } else {
    return NextResponse.json(
      { error: "Укажите rooms_available или close_count" },
      { status: 400 }
    );
  }

  if (available > room.totalRooms) {
    return NextResponse.json(
      {
        error: `Не больше ${room.totalRooms} номеров в этой категории`,
      },
      { status: 400 }
    );
  }

  const days = await setInventoryDates(
    d.category_id,
    d.date_from,
    d.date_to,
    available
  );

  return NextResponse.json({
    ok: true,
    action: "set",
    days,
    category_id: d.category_id,
    rooms_available: available,
    closed_rooms: Math.max(0, room.totalRooms - available),
    total_rooms: room.totalRooms,
    date_from: d.date_from,
    date_to: d.date_to,
  });
}
