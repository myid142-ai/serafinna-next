import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      time: new Date().toISOString(),
      db: { dialect: "sqlite-or-postgres", ok: true },
      stack: "nextjs",
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "db error",
        stack: "nextjs",
      },
      { status: 500 }
    );
  }
}
