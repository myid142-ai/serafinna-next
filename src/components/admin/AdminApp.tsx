"use client";

import { useCallback, useEffect, useState } from "react";

type Room = {
  id: string;
  name: string;
  price: number;
  total_rooms: number;
  available_rooms: number;
  monthly_prices?: Record<number, number>;
};

type Booking = {
  id: number;
  guest_name: string;
  phone: string;
  category_name: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  total_price: number;
  comment: string;
  created_at: string;
};

const MONTHS = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];

const STATUSES = [
  "pending",
  "awaiting_payment",
  "paid",
  "confirmed",
  "checked_in",
  "checked_out",
  "rejected",
  "cancelled",
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

export function AdminApp({ adminPathHint }: { adminPathHint: string }) {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"bookings" | "rooms" | "prices">("bookings");

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [priceRoom, setPriceRoom] = useState("");
  const [monthPrices, setMonthPrices] = useState<Record<string, number>>({});

  const refreshMe = useCallback(async () => {
    try {
      const me = await api<{ username: string }>("/api/admin/me");
      setUser(me.username);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const loadBookings = useCallback(async () => {
    const q = filter ? `?status=${encodeURIComponent(filter)}` : "";
    const data = await api<Booking[]>(`/api/admin/bookings${q}`);
    setBookings(data);
  }, [filter]);

  const loadRooms = useCallback(async () => {
    const data = await api<Room[]>("/api/admin/rooms");
    setRooms(data);
    if (!priceRoom && data[0]) setPriceRoom(data[0].id);
  }, [priceRoom]);

  const loadPrices = useCallback(async (roomId: string) => {
    const data = await api<{ prices: Record<string, number> }>(
      `/api/admin/rooms/${roomId}/prices`
    );
    setMonthPrices(data.prices || {});
  }, []);

  useEffect(() => {
    if (!user) return;
    if (tab === "bookings") loadBookings().catch((e) => setErr(e.message));
    if (tab === "rooms" || tab === "prices")
      loadRooms().catch((e) => setErr(e.message));
  }, [user, tab, filter, loadBookings, loadRooms]);

  useEffect(() => {
    if (user && tab === "prices" && priceRoom) {
      loadPrices(priceRoom).catch((e) => setErr(e.message));
    }
  }, [user, tab, priceRoom, loadPrices]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const r = await api<{ username: string }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setUser(r.username);
      setPassword("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка входа");
    }
  }

  async function logout() {
    await api("/api/admin/logout", { method: "POST" }).catch(() => null);
    setUser(null);
  }

  async function setStatus(id: number, status: string) {
    setErr("");
    try {
      await api(`/api/admin/bookings/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await loadBookings();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function saveRoom(room: Room) {
    setErr("");
    try {
      await api(`/api/admin/rooms/${room.id}`, {
        method: "PUT",
        body: JSON.stringify({
          price: room.price,
          total_rooms: room.total_rooms,
          available_rooms: room.available_rooms,
        }),
      });
      await loadRooms();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function savePrices() {
    if (!priceRoom) return;
    setErr("");
    try {
      await api(`/api/admin/rooms/${priceRoom}/prices`, {
        method: "PUT",
        body: JSON.stringify({ prices: monthPrices }),
      });
      setErr("");
      alert("Цены сохранены");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--muted)]">
        Загрузка…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-4">
        <form
          onSubmit={login}
          className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-8 shadow-md"
        >
          <h1 className="font-serif text-2xl font-semibold text-[var(--sea)]">
            Серафинна · панель
          </h1>
          <p className="text-xs text-[var(--muted)]">Путь: /{adminPathHint}</p>
          <label className="block text-sm">
            Логин
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="block text-sm">
            Пароль
            <input
              type="password"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-[var(--sea)] py-2.5 font-semibold text-white"
          >
            Войти
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7]">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <strong className="text-[var(--sea)]">Серафинна</strong>
            <span className="ml-2 text-sm text-[var(--muted)]">{user}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["bookings", "Заявки"],
                ["rooms", "Номера"],
                ["prices", "Цены по месяцам"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  tab === id
                    ? "bg-[var(--sea)] text-white"
                    : "bg-[var(--sea-light)] text-[var(--sea-dark)]"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={logout}
              className="rounded-full border px-3 py-1.5 text-sm"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {err && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </p>
        )}

        {tab === "bookings" && (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilter("")}
                className={`rounded-full px-3 py-1 text-sm ${!filter ? "bg-[var(--sea)] text-white" : "bg-white border"}`}
              >
                Все
              </button>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilter(s)}
                  className={`rounded-full px-3 py-1 text-sm ${filter === s ? "bg-[var(--sea)] text-white" : "bg-white border"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            {bookings.length === 0 && (
              <p className="text-[var(--muted)]">Заявок нет</p>
            )}
            {bookings.map((b) => (
              <article
                key={b.id}
                className="rounded-2xl border bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">
                      №{b.id} · {b.guest_name}
                    </h3>
                    <p className="text-sm text-[var(--muted)]">
                      {b.category_name} · {b.check_in} → {b.check_out} ·{" "}
                      {b.guests} гост. · {b.phone}
                    </p>
                    <p className="text-sm font-medium text-[var(--sea)]">
                      {Number(b.total_price).toLocaleString("ru-RU")} ₽ ·{" "}
                      <span className="rounded bg-[var(--sea-light)] px-2 py-0.5 text-xs">
                        {b.status}
                      </span>
                    </p>
                    {b.comment && (
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {b.comment}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {["confirmed", "rejected", "cancelled", "paid"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={b.status === s}
                        onClick={() => setStatus(b.id, s)}
                        className="rounded-full border px-2 py-1 text-xs disabled:opacity-40"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {tab === "rooms" && (
          <section className="space-y-4">
            {rooms.map((r) => (
              <RoomEditor key={r.id} room={r} onSave={saveRoom} />
            ))}
          </section>
        )}

        {tab === "prices" && (
          <section className="space-y-4">
            <label className="block text-sm">
              Категория
              <select
                className="mt-1 w-full max-w-md rounded-lg border px-3 py-2"
                value={priceRoom}
                onChange={(e) => setPriceRoom(e.target.value)}
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {MONTHS.map((label, i) => {
                const m = String(i + 1);
                return (
                  <label key={m} className="text-sm">
                    {label}
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border px-2 py-1.5"
                      value={monthPrices[m] ?? ""}
                      onChange={(e) =>
                        setMonthPrices((prev) => ({
                          ...prev,
                          [m]: Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              onClick={savePrices}
              className="rounded-full bg-[var(--sea)] px-6 py-2 font-semibold text-white"
            >
              Сохранить цены
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

function RoomEditor({
  room,
  onSave,
}: {
  room: Room;
  onSave: (r: Room) => Promise<void>;
}) {
  const [price, setPrice] = useState(room.price);
  const [total, setTotal] = useState(room.total_rooms);
  const [avail, setAvail] = useState(room.available_rooms);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrice(room.price);
    setTotal(room.total_rooms);
    setAvail(room.available_rooms);
  }, [room]);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h3 className="font-semibold">{room.name}</h3>
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <label>
          Базовая цена
          <input
            type="number"
            className="mt-1 w-full rounded-lg border px-2 py-1.5"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </label>
        <label>
          Всего номеров
          <input
            type="number"
            className="mt-1 w-full rounded-lg border px-2 py-1.5"
            value={total}
            onChange={(e) => setTotal(Number(e.target.value))}
          />
        </label>
        <label>
          Свободно
          <input
            type="number"
            className="mt-1 w-full rounded-lg border px-2 py-1.5"
            value={avail}
            onChange={(e) => setAvail(Number(e.target.value))}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={saving}
        className="mt-3 rounded-full bg-[var(--sea)] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        onClick={async () => {
          setSaving(true);
          try {
            await onSave({
              ...room,
              price,
              total_rooms: total,
              available_rooms: avail,
            });
          } finally {
            setSaving(false);
          }
        }}
      >
        Сохранить
      </button>
    </div>
  );
}
