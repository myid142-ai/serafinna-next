import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeBooking } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const status = req.nextUrl.searchParams.get("status") || "";
  const rows = await prisma.booking.findMany({
    where: status ? { status } : undefined,
    include: { room: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(rows.map(serializeBooking));
}
