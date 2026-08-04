import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { setBookingStatus } from "@/lib/bookings";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const bookingId = Number(id);
  if (!Number.isFinite(bookingId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || "").trim();
  const comment = String(body.comment || body.manager_comment || "");
  if (!status) {
    return NextResponse.json({ error: "status required" }, { status: 400 });
  }

  const result = await setBookingStatus(
    bookingId,
    status,
    auth.username,
    comment
  );
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.booking);
}
