import { SiteLanding } from "@/components/site/SiteLanding";
import { prisma } from "@/lib/db";
import { roomJson } from "@/lib/rooms";

export const dynamic = "force-static";
export const revalidate = 120;

export const metadata = {
  title: "Серафинна — полная версия сайта",
  robots: { index: false, follow: true },
};

export default async function FullSitePage() {
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
