import { prisma } from "@/lib/db";
import { loadStayContext } from "@/lib/rooms";

const OCCUPYING = new Set([
  "confirmed",
  "paid",
  "checked_in",
  "awaiting_payment",
]);

export async function setBookingStatus(
  bookingId: number,
  newStatus: string,
  actor: string,
  comment = ""
): Promise<{ booking: Record<string, unknown> } | { error: string; status: number }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: true },
  });
  if (!booking) return { error: "Заявка не найдена", status: 404 };

  const old = booking.status;
  if (old === newStatus) {
    return {
      booking: serializeBooking(booking),
    };
  }

  const wasOcc = OCCUPYING.has(old);
  const willOcc = OCCUPYING.has(newStatus);
  const now = new Date().toISOString();

  let totalPrice = booking.totalPrice;
  if (willOcc && !wasOcc) {
    const ctx = await loadStayContext(
      booking.categoryId,
      booking.checkIn,
      booking.checkOut
    );
    if (ctx?.stay.can_book === false && old === "pending") {
      // allow confirm only if still bookable, or force for admin
    }
    if (ctx) totalPrice = ctx.stay.total_price;

    // decrement available rooms (legacy counter)
    await prisma.room.update({
      where: { id: booking.categoryId },
      data: {
        availableRooms: {
          decrement: 1,
        },
      },
    });

    // auto income
    const existing = await prisma.financeTransaction.findFirst({
      where: {
        bookingId,
        kind: "income",
        voided: 0,
      },
    });
    if (!existing) {
      await prisma.financeTransaction.create({
        data: {
          kind: "income",
          amount: totalPrice,
          category: "Проживание",
          roomCategoryId: booking.categoryId,
          bookingId,
          description: `Бронь №${bookingId}: ${booking.guestName}, ${booking.checkIn} → ${booking.checkOut}`,
          txDate: now.slice(0, 10),
          createdAt: now,
          createdBy: actor,
          voided: 0,
        },
      });
    }
  }

  if (wasOcc && !willOcc) {
    await prisma.room.update({
      where: { id: booking.categoryId },
      data: { availableRooms: { increment: 1 } },
    });
    await prisma.financeTransaction.updateMany({
      where: { bookingId, kind: "income", voided: 0 },
      data: { voided: 1 },
    });
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: newStatus,
      totalPrice,
      managerComment: comment || booking.managerComment,
      handledBy: actor,
      handledAt: now,
      updatedAt: now,
    },
    include: { room: true },
  });

  await prisma.bookingHistory.create({
    data: {
      bookingId,
      actor,
      action: "status_change",
      oldStatus: old,
      newStatus,
      comment,
      createdAt: now,
    },
  });

  return { booking: serializeBooking(updated) };
}

export function serializeBooking(b: {
  id: number;
  categoryId: string;
  guestName: string;
  phone: string;
  email: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  comment: string;
  status: string;
  totalPrice: number;
  managerComment: string;
  handledBy: string;
  handledAt: string | null;
  createdAt: string;
  updatedAt: string;
  room?: { name: string } | null;
}) {
  return {
    id: b.id,
    category_id: b.categoryId,
    category_name: b.room?.name || b.categoryId,
    guest_name: b.guestName,
    phone: b.phone,
    email: b.email,
    check_in: b.checkIn,
    check_out: b.checkOut,
    guests: b.guests,
    comment: b.comment,
    status: b.status,
    total_price: b.totalPrice,
    manager_comment: b.managerComment,
    handled_by: b.handledBy,
    handled_at: b.handledAt,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  };
}
