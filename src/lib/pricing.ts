/**
 * Pricing / availability domain (port from Flask calc_stay rules).
 * Nights are [checkIn, checkOut) — checkout day is free.
 */

export const OCCUPYING_STATUSES = [
  "confirmed",
  "paid",
  "checked_in",
  "awaiting_payment",
] as const;

export function parseYmd(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Local YYYY-MM-DD — avoid UTC shift from toISOString() */
export function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function eachNight(checkIn: string, checkOut: string): string[] {
  const a = parseYmd(checkIn);
  const b = parseYmd(checkOut);
  if (!a || !b || b <= a) return [];
  const days: string[] = [];
  const cur = new Date(a);
  while (cur < b) {
    days.push(formatYmd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function nightsCount(checkIn: string, checkOut: string): number {
  return eachNight(checkIn, checkOut).length;
}

export type StayInput = {
  checkIn: string;
  checkOut: string;
  basePrice: number;
  totalRooms: number;
  /** day -> override capacity */
  inventory: Record<string, number>;
  /** day blocked */
  blockedDays: Set<string>;
  /** month 1-12 -> nightly price */
  monthlyPrices: Record<number, number>;
  /** occupying booking count per night (from other bookings) */
  occupiedByNight: Record<string, number>;
  minNights?: number;
};

export type StayResult = {
  nights: number;
  total_price: number;
  avg_price: number;
  min_available: number;
  can_book: boolean;
  nights_detail: { day: string; price: number; free: number; blocked: boolean }[];
  reason?: string;
};

export function calcStay(input: StayInput): StayResult {
  const nights = eachNight(input.checkIn, input.checkOut);
  if (nights.length < 1) {
    return {
      nights: 0,
      total_price: 0,
      avg_price: 0,
      min_available: 0,
      can_book: false,
      nights_detail: [],
      reason: "Некорректный период",
    };
  }

  const minN = input.minNights ?? 1;
  if (nights.length < minN) {
    return {
      nights: nights.length,
      total_price: 0,
      avg_price: 0,
      min_available: 0,
      can_book: false,
      nights_detail: [],
      reason: `Минимум ${minN} ноч.`,
    };
  }

  let total = 0;
  let minFree = Infinity;
  const detail: StayResult["nights_detail"] = [];

  for (const day of nights) {
    const month = Number(day.slice(5, 7));
    const price =
      input.monthlyPrices[month] ??
      input.monthlyPrices[month] ??
      input.basePrice;
    const capacity =
      input.inventory[day] !== undefined
        ? input.inventory[day]
        : input.totalRooms;
    const occupied = input.occupiedByNight[day] ?? 0;
    const blocked = input.blockedDays.has(day);
    const free = blocked ? 0 : Math.max(0, capacity - occupied);
    total += price;
    minFree = Math.min(minFree, free);
    detail.push({ day, price, free, blocked });
  }

  const can = minFree >= 1 && !detail.some((d) => d.blocked);
  return {
    nights: nights.length,
    total_price: total,
    avg_price: Math.round(total / nights.length),
    min_available: minFree === Infinity ? 0 : minFree,
    can_book: can,
    nights_detail: detail,
    reason: can ? undefined : "Нет свободных номеров на выбранные даты",
  };
}

export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("8")) {
    digits = "7" + digits.slice(1);
  }
  if (digits.length === 10 && digits.startsWith("9")) {
    digits = "7" + digits;
  }
  if (digits.startsWith("7") && digits.length === 11) {
    return "+" + digits;
  }
  if (String(raw).trim().startsWith("+") && digits.length >= 10) {
    return "+" + digits;
  }
  return digits ? "+" + digits : "";
}
