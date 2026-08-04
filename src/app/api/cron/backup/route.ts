import { NextRequest, NextResponse } from "next/server";
import { makeJsonBackup } from "@/lib/ops";
import { sendTelegramDocument } from "@/lib/telegram";

export const dynamic = "force-dynamic";

function cronOk(req: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  const h = req.headers.get("x-cron-secret") || "";
  const q = req.nextUrl.searchParams.get("secret") || "";
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return h === secret || q === secret || bearer === secret;
}

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  if (!cronOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = await makeJsonBackup();
  const stamp = b.createdAt.replace(/[:.]/g, "-");
  const doc = await sendTelegramDocument(
    `serafinna-backup-${stamp}.json`,
    b.payload,
    `Резервная копия Serafinna ${b.createdAt}`
  );
  return NextResponse.json({
    ok: true,
    id: b.id,
    bytes: b.bytes,
    created_at: b.createdAt,
    telegram: doc,
  });
}
