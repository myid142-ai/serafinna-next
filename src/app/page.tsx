import { SiteLanding } from "@/components/site/SiteLanding";
import { prisma } from "@/lib/db";
import { loadMonthlyPrices, roomJson } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rows = await prisma.room.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const rooms = [];
  for (const r of rows) {
    const monthly = await loadMonthlyPrices(r.id);
    rooms.push(roomJson(r, null, monthly));
  }
  return <SiteLanding initialRooms={rooms} />;
}
