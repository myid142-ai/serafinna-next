import { NextRequest, NextResponse } from "next/server";
import { loadStayContext } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const categoryId = req.nextUrl.searchParams.get("category_id") || "";
  const checkIn = req.nextUrl.searchParams.get("check_in") || "";
  const checkOut = req.nextUrl.searchParams.get("check_out") || "";
  if (!categoryId || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: "category_id, check_in, check_out required" },
      { status: 400 }
    );
  }
  const ctx = await loadStayContext(categoryId, checkIn, checkOut);
  if (!ctx) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
  }
  return NextResponse.json({
    category_id: categoryId,
    category_name: ctx.room.name,
    ...ctx.stay,
  });
}
