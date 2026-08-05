import { SiteLanding } from "@/components/site/SiteLanding";
import { prisma } from "@/lib/db";
import { roomJson } from "@/lib/rooms";

// Full marketing site + booking (normal homepage)
export const dynamic = "force-static";
export const revalidate = 120;

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
