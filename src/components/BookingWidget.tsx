"use client";

import { useMemo, useState } from "react";

type RoomOpt = { id: string; name: string };

export function BookingWidget({ rooms }: { rooms: RoomOpt[] }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [categoryId, setCategoryId] = useState(rooms[0]?.id || "");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState(2);
  const [comment, setComment] = useState("");
  const [quote, setQuote] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const canQuote = useMemo(
    () => Boolean(checkIn && checkOut && categoryId && checkOut > checkIn),
    [checkIn, checkOut, categoryId]
  );

  async function refreshQuote() {
    if (!canQuote) return;
    const q = new URLSearchParams({
      category_id: categoryId,
      check_in: checkIn,
      check_out: checkOut,
    });
    const res = await fetch(`/api/quote?${q}`);
    const data = await res.json();
    if (!res.ok) {
      setQuote(data.error || "Ошибка расчёта");
      return;
    }
    setQuote(
      data.can_book
        ? `${data.nights} ноч. · ${Number(data.total_price).toLocaleString("ru-RU")} ₽ (ср. ${Number(data.avg_price).toLocaleString("ru-RU")} ₽/ночь)`
        : data.reason || "Недоступно"
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: categoryId,
          guest_name: guestName,
          phone,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Ошибка");
        return;
      }
      setStatus(
        `Заявка №${data.id} принята. Сумма ориентир: ${Number(data.total_price).toLocaleString("ru-RU")} ₽. Мы свяжемся с вами.`
      );
    } catch {
      setStatus("Сеть недоступна. Напишите в WhatsApp.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-2xl bg-white p-6 shadow-sm"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) return;
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          Заезд *
          <input
            type="date"
            required
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            onBlur={refreshQuote}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Выезд *
          <input
            type="date"
            required
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            onBlur={refreshQuote}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
      </div>
      <label className="block text-sm">
        Категория *
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setTimeout(refreshQuote, 0);
          }}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      {quote && (
        <p className="rounded-lg bg-[var(--sea-light)] px-3 py-2 text-sm text-[var(--sea-dark)]">
          {quote}
        </p>
      )}
      <label className="block text-sm">
        Имя *
        <input
          required
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Телефон *
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+7..."
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Гостей
        <input
          type="number"
          min={1}
          max={20}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Комментарий
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-[var(--sea)] py-3 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Отправка…" : "Отправить заявку"}
      </button>
      {status && <p className="text-sm text-[var(--muted)]">{status}</p>}
    </form>
  );
}
