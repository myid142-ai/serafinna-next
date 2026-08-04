import { SiteLanding } from "@/components/site/SiteLanding";
import { prisma } from "@/lib/db";
import { roomJson } from "@/lib/rooms";

// Cache HTML at the edge so the custom domain does not hang on a long stream.
export const revalidate = 60;

export default async function HomePage() {
  const rows = await prisma.room.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { monthlyPrices: true },
  });
  const rooms = rows.map((r) => {
    const monthly: Record<number, number> = {};
    for (const mp of r.monthlyPrices) monthly[mp.month] = mp.price;
    return roomJson(r, null, monthly);
  });
  return <SiteLanding initialRooms={rooms} />;
}
