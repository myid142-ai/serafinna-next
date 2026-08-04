import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const bookingId = Number(id);
  const rows = await prisma.bookingHistory.findMany({
    where: { bookingId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    rows.map((h) => ({
      id: h.id,
      booking_id: h.bookingId,
      actor: h.actor,
      action: h.action,
      old_status: h.oldStatus,
      new_status: h.newStatus,
      comment: h.comment,
      created_at: h.createdAt,
    }))
  );
}
