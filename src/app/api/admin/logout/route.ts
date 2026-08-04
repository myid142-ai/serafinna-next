import { NextResponse } from "next/server";
import { getSession, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
