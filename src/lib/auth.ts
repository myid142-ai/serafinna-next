import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export type SessionData = {
  isLoggedIn: boolean;
  username: string;
};

export function sessionOptions(): SessionOptions {
  const password = process.env.SERAFINNA_SECRET || "";
  if (password.length < 32) {
    // iron-session requires ≥32 chars
    console.warn("SERAFINNA_SECRET should be ≥32 characters");
  }
  return {
    password: password.padEnd(32, "0").slice(0, 64),
    cookieName: "serafinna_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}

export async function requireAdmin(): Promise<
  { ok: true; username: string } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.username) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Требуется вход" }, { status: 401 }),
    };
  }
  return { ok: true, username: session.username };
}

export async function ensureAdminFromEnv(): Promise<void> {
  const user = (process.env.SERAFINNA_ADMIN_USER || "admin").trim() || "admin";
  const pass = (process.env.SERAFINNA_ADMIN_PASS || "").trim();
  if (!pass || pass.length < 12) return;

  const hash = await bcrypt.hash(pass, 10);
  await prisma.admin.upsert({
    where: { username: user },
    create: { username: user, passwordHash: hash },
    update: { passwordHash: hash },
  });
}

export async function verifyAdmin(
  username: string,
  password: string
): Promise<boolean> {
  await ensureAdminFromEnv();
  const row = await prisma.admin.findUnique({ where: { username } });
  if (!row) return false;
  return bcrypt.compare(password, row.passwordHash);
}

export function adminPath(): string {
  return (process.env.SERAFINNA_ADMIN_PATH || "m-panel").replace(/^\/+|\/+$/g, "");
}
