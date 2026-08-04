import { NextRequest, NextResponse } from "next/server";
import { dailySummaryText, makeJsonBackup } from "@/lib/ops";
import { sendTelegramDocument, sendTelegramMessage } from "@/lib/telegram";

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
  const text = await dailySummaryText();
  const telegram = await sendTelegramMessage(text);

  let backup: Record<string, unknown> = {};
  try {
    const b = await makeJsonBackup();
    const stamp = b.createdAt.replace(/[:.]/g, "-");
    const doc = await sendTelegramDocument(
      `serafinna-backup-${stamp}.json`,
      b.payload,
      `Резервная копия Serafinna ${b.createdAt}`
    );
    backup = {
      id: b.id,
      bytes: b.bytes,
      created_at: b.createdAt,
      telegram: doc,
    };
  } catch (e) {
    backup = {
      error: e instanceof Error ? e.message : "backup failed",
    };
  }

  return NextResponse.json({ ok: true, telegram, backup });
}
