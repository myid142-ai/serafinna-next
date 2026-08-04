import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEASON_MULT: Record<number, number> = {
  1: 0.7,
  2: 0.7,
  3: 0.75,
  4: 0.85,
  5: 0.95,
  6: 1.1,
  7: 1.35,
  8: 1.35,
  9: 1.05,
  10: 0.9,
  11: 0.75,
  12: 0.8,
};

function seasonalPrice(base: number, month: number): number {
  const mult = SEASON_MULT[month] ?? 1;
  return Math.max(0, Math.round((base * mult) / 100) * 100);
}

const ROOMS = [
  {
    id: "double-sea",
    name: "Двухместный номер с видом на море",
    description:
      "Панорамный балкон, двуспальная кровать, ТВ, кондиционер, мини-холодильник.",
    price: 4500,
    totalRooms: 4,
    availableRooms: 4,
    sortOrder: 1,
  },
  {
    id: "apartments-2br",
    name: "Апартаменты с двумя спальнями с видом на море",
    description: "Две спальни, балкон с видом на море, ТВ, кондиционер.",
    price: 7000,
    totalRooms: 1,
    availableRooms: 1,
    sortOrder: 2,
  },
  {
    id: "family",
    name: "Семейный номер",
    description: "Двуспальная и односпальная кровати, диван, душ, балкон.",
    price: 5500,
    totalRooms: 4,
    availableRooms: 4,
    sortOrder: 3,
  },
];

async function main() {
  const now = new Date().toISOString();

  for (const room of ROOMS) {
    await prisma.room.upsert({
      where: { id: room.id },
      create: room,
      update: {
        name: room.name,
        description: room.description,
        price: room.price,
        totalRooms: room.totalRooms,
        sortOrder: room.sortOrder,
      },
    });

    for (let month = 1; month <= 12; month++) {
      const price = seasonalPrice(room.price, month);
      await prisma.monthlyPrice.upsert({
        where: {
          categoryId_month: { categoryId: room.id, month },
        },
        create: { categoryId: room.id, month, price },
        update: { price },
      });
    }
  }

  const content: Record<string, string> = {
    hero_lead:
      "Гостевой дом в Джубге с панорамным видом на море, парковкой и мангальной зоной.",
    booking_note:
      "Бронирование по предоплате за первую ночь. Ответ в течение 2 часов днём.",
    response_hours: "2",
    about_text: "Серафинна — гостевой дом у моря в Джубге, ул. Маяковского 5А.",
  };

  for (const [key, value] of Object.entries(content)) {
    await prisma.siteContent.upsert({
      where: { key },
      create: { key, value, updatedAt: now },
      update: { value, updatedAt: now },
    });
  }

  console.log("Seed OK: rooms, monthly prices, content");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
