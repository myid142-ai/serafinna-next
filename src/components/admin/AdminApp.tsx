"use client";

import { useCallback, useEffect, useState } from "react";
import "@/styles/admin.css";

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

type Summary = {
  today: string;
  tomorrow: string;
  check_ins: number;
  check_outs: number;
  pending: number;
  free_today: { id: string; name: string; free: number; total: number }[];
  pending_list: Booking[];
  text: string;
};

type BlockRow = {
  id: number;
  category_id: string;
  category_name: string;
  day: string;
  reason: string;
  note: string;
};

type InvRow = {
  category_id: string;
  category_name: string;
  day: string;
  rooms_available: number;
  total_rooms: number | null;
  closed_rooms: number | null;
};

type CalDay = {
  day: string;
  free: number;
  capacity: number;
  occupied?: number;
  blocked?: boolean;
  status: "free" | "partial" | "busy" | "blocked";
  price: number;
};

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

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

const STATUS_LABEL: Record<string, string> = {
  pending: "Ожидает",
  awaiting_payment: "Ждём оплату",
  paid: "Оплачено",
  confirmed: "Подтверждена",
  checked_in: "Заселён",
  checked_out: "Выехал",
  rejected: "Отклонена",
  cancelled: "Отменена",
};

const FILTERS = [
  { id: "", label: "Все" },
  { id: "pending", label: "Ожидают" },
  { id: "confirmed", label: "Подтверждены" },
  { id: "paid", label: "Оплачены" },
  { id: "rejected", label: "Отклонены" },
  { id: "cancelled", label: "Отменены" },
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

type Tab = "summary" | "bookings" | "rooms" | "prices" | "blocks";

export function AdminApp({ adminPathHint }: { adminPathHint: string }) {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [tab, setTab] = useState<Tab>("summary");

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState("pending");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [priceRoom, setPriceRoom] = useState("");
  const [monthPrices, setMonthPrices] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState<Summary | null>(null);

  const [blockRoom, setBlockRoom] = useState("");
  const [blockFrom, setBlockFrom] = useState("");
  const [blockTo, setBlockTo] = useState("");
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [inventoryRows, setInventoryRows] = useState<InvRow[]>([]);
  /** How many rooms to leave sellable on the period (0 = none). */
  const [invAvailable, setInvAvailable] = useState(0);
  const [blockBusy, setBlockBusy] = useState(false);
  const nowCal = new Date();
  const [calYear, setCalYear] = useState(nowCal.getFullYear());
  const [calMonth, setCalMonth] = useState(nowCal.getMonth() + 1);
  const [calDays, setCalDays] = useState<CalDay[]>([]);
  const [calFirstWd, setCalFirstWd] = useState(0);
  const [calLoading, setCalLoading] = useState(false);

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
    if (!blockRoom && data[0]) setBlockRoom(data[0].id);
  }, [priceRoom, blockRoom]);

  const loadPrices = useCallback(async (roomId: string) => {
    const data = await api<{ prices: Record<string, number> }>(
      `/api/admin/rooms/${roomId}/prices`
    );
    setMonthPrices(data.prices || {});
  }, []);

  const loadSummary = useCallback(async () => {
    const data = await api<Summary>("/api/admin/summary");
    setSummary(data);
  }, []);

  const loadBlocks = useCallback(async () => {
    const data = await api<BlockRow[]>("/api/admin/blocks");
    setBlocks(data);
  }, []);

  const loadInventory = useCallback(async () => {
    const q = blockRoom
      ? `?category_id=${encodeURIComponent(blockRoom)}`
      : "";
    const data = await api<InvRow[]>(`/api/admin/inventory${q}`);
    setInventoryRows(data);
  }, [blockRoom]);

  const loadCalendar = useCallback(async () => {
    if (!blockRoom) return;
    setCalLoading(true);
    try {
      const q = new URLSearchParams({
        year: String(calYear),
        month: String(calMonth),
        category_id: blockRoom,
      });
      const data = await api<{
        days: CalDay[];
        first_weekday: number;
      }>(`/api/calendar?${q}`);
      setCalDays(Array.isArray(data.days) ? data.days : []);
      setCalFirstWd(Number(data.first_weekday) || 0);
    } finally {
      setCalLoading(false);
    }
  }, [blockRoom, calYear, calMonth]);

  const selectedRoomTotal =
    rooms.find((r) => r.id === blockRoom)?.total_rooms ?? 0;

  useEffect(() => {
    if (!user) return;
    setErr("");
    if (tab === "bookings") loadBookings().catch((e) => setErr(e.message));
    if (tab === "rooms" || tab === "prices" || tab === "blocks")
      loadRooms().catch((e) => setErr(e.message));
    if (tab === "summary") loadSummary().catch((e) => setErr(e.message));
    if (tab === "blocks") {
      loadBlocks().catch((e) => setErr(e.message));
      loadInventory().catch((e) => setErr(e.message));
    }
  }, [
    user,
    tab,
    filter,
    loadBookings,
    loadRooms,
    loadSummary,
    loadBlocks,
    loadInventory,
  ]);

  useEffect(() => {
    if (user && tab === "blocks" && blockRoom) {
      loadCalendar().catch((e) => setErr(e.message));
      loadInventory().catch((e) => setErr(e.message));
    }
  }, [user, tab, blockRoom, calYear, calMonth, loadCalendar, loadInventory]);

  useEffect(() => {
    const total = rooms.find((r) => r.id === blockRoom)?.total_rooms;
    if (total != null && total > 0) {
      setInvAvailable((prev) => (prev > total ? total : prev));
    }
  }, [blockRoom, rooms]);

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
    setOkMsg("");
    try {
      await api(`/api/admin/bookings/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await loadBookings();
      setOkMsg(`Заявка №${id}: ${STATUS_LABEL[status] || status}`);
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
      setOkMsg("Номер сохранён");
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
      setOkMsg("Цены сохранены");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function runBlock(action: "block" | "unblock", from?: string, to?: string) {
    const dateFrom = from || blockFrom;
    const dateTo = to || blockTo;
    if (!blockRoom || !dateFrom || !dateTo) {
      setErr("Выберите категорию и даты");
      return;
    }
    setBlockBusy(true);
    setErr("");
    setOkMsg("");
    try {
      const r = await api<{ days: number }>("/api/admin/blocks", {
        method: "POST",
        body: JSON.stringify({
          category_id: blockRoom,
          date_from: dateFrom,
          date_to: dateTo,
          action,
          reason: "closed",
          note: "admin",
        }),
      });
      await Promise.all([loadBlocks(), loadCalendar(), loadInventory()]);
      setOkMsg(
        action === "block"
          ? `Полностью закрыто дней: ${r.days}`
          : `Снято полных блоков: ${r.days}`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBlockBusy(false);
    }
  }

  /** Set sellable room count for period (partial close). */
  async function runInventory(action: "set" | "clear") {
    if (!blockRoom || !blockFrom || !blockTo) {
      setErr("Выберите категорию и даты (с — по)");
      return;
    }
    if (action === "set" && invAvailable < 0) {
      setErr("Укажите доступное число номеров ≥ 0");
      return;
    }
    setBlockBusy(true);
    setErr("");
    setOkMsg("");
    try {
      const r = await api<{
        days: number;
        rooms_available?: number;
        closed_rooms?: number;
        total_rooms?: number;
      }>("/api/admin/inventory", {
        method: "POST",
        body: JSON.stringify({
          category_id: blockRoom,
          date_from: blockFrom,
          date_to: blockTo,
          action,
          rooms_available: invAvailable,
        }),
      });
      await Promise.all([loadBlocks(), loadCalendar(), loadInventory()]);
      if (action === "clear") {
        setOkMsg(
          `Сброшен лимит на ${r.days} дн. — снова все ${selectedRoomTotal} номеров`
        );
      } else {
        const closed = r.closed_rooms ?? Math.max(0, selectedRoomTotal - invAvailable);
        setOkMsg(
          `На ${r.days} дн.: доступно ${r.rooms_available ?? invAvailable} из ${r.total_rooms ?? selectedRoomTotal} (закрыто ${closed})`
        );
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBlockBusy(false);
    }
  }

  /** Click day: toggle full manual close. */
  async function onCalDayClick(d: CalDay) {
    if (blockBusy) return;
    if (d.blocked) {
      await runBlock("unblock", d.day, d.day);
      return;
    }
    await runBlock("block", d.day, d.day);
  }

  function shiftMonth(delta: number) {
    let y = calYear;
    let m = calMonth + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setCalYear(y);
    setCalMonth(m);
  }

  if (loading) {
    return (
      <div className="admin">
        <div className="admin-loading">Загрузка панели…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin">
        <div className="admin-login">
          <form className="admin-login__card" onSubmit={login}>
            <h1 className="admin-login__brand">Серафинна</h1>
            <p className="admin-login__hint">
              Панель управления · /{adminPathHint}
            </p>
            <label className="admin-field">
              Логин
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </label>
            <label className="admin-field">
              Пароль
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            {err && <p className="admin-alert">{err}</p>}
            <button type="submit" className="admin-btn admin-btn--primary admin-btn--block">
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "summary", label: "Сводка" },
    { id: "bookings", label: "Заявки" },
    { id: "blocks", label: "Календарь / закрытие" },
    { id: "rooms", label: "Номера" },
    { id: "prices", label: "Цены" },
  ];

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-wrap admin-header__inner">
          <div className="admin-header__brand">
            <div className="admin-header__title">Серафинна</div>
            <div className="admin-header__user">панель · {user}</div>
          </div>
          <nav className="admin-nav">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`admin-nav__btn${tab === t.id ? " is-active" : ""}`}
                onClick={() => {
                  setTab(t.id);
                  setOkMsg("");
                  setErr("");
                }}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={logout}
            >
              Выйти
            </button>
          </nav>
        </div>
      </header>

      <main className="admin-wrap admin-main">
        {err && <div className="admin-alert">{err}</div>}
        {okMsg && <div className="admin-alert admin-alert--ok">{okMsg}</div>}

        {tab === "summary" && (
          <section>
            <div className="admin-section-head">
              <div>
                <h2>Сводка на сегодня</h2>
                <p>{summary?.today || "—"} · обновляется при открытии вкладки</p>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn--soft"
                onClick={() => loadSummary().catch((e) => setErr(e.message))}
              >
                Обновить
              </button>
            </div>

            <div className="admin-stats">
              <div className="admin-stat">
                <div className="admin-stat__label">Заезд</div>
                <div className="admin-stat__value">{summary?.check_ins ?? "—"}</div>
              </div>
              <div className="admin-stat">
                <div className="admin-stat__label">Выезд</div>
                <div className="admin-stat__value">{summary?.check_outs ?? "—"}</div>
              </div>
              <div className="admin-stat">
                <div className="admin-stat__label">Pending</div>
                <div className="admin-stat__value">{summary?.pending ?? "—"}</div>
              </div>
              <div className="admin-stat">
                <div className="admin-stat__label">Завтра</div>
                <div className="admin-stat__value" style={{ fontSize: "1.25rem" }}>
                  {summary?.tomorrow || "—"}
                </div>
              </div>
            </div>

            <div className="admin-section-head">
              <div>
                <h2>Свободно сегодня</h2>
              </div>
            </div>
            <div className="admin-grid-3">
              {(summary?.free_today || []).map((r) => (
                <div key={r.id} className="admin-card" style={{ marginBottom: 0 }}>
                  <h3 className="admin-card__title" style={{ fontSize: "0.95rem" }}>
                    {r.name}
                  </h3>
                  <p className="admin-card__price">
                    {r.free} / {r.total}
                  </p>
                  <p className="admin-card__meta">свободно из всего</p>
                </div>
              ))}
            </div>

            {(summary?.pending_list?.length || 0) > 0 && (
              <>
                <div className="admin-section-head" style={{ marginTop: "1.5rem" }}>
                  <div>
                    <h2>Свежие заявки</h2>
                  </div>
                </div>
                {summary!.pending_list.map((b) => (
                  <article key={b.id} className="admin-card">
                    <div className="admin-card__top">
                      <div>
                        <h3 className="admin-card__title">
                          №{b.id} · {b.guest_name}
                        </h3>
                        <p className="admin-card__meta">
                          {b.category_name} · {b.check_in} → {b.check_out} · {b.phone}
                        </p>
                      </div>
                      <span className="admin-badge admin-badge--pending">Ожидает</span>
                    </div>
                  </article>
                ))}
              </>
            )}
          </section>
        )}

        {tab === "bookings" && (
          <section>
            <div className="admin-section-head">
              <div>
                <h2>Заявки</h2>
                <p>Подтверждение закрывает даты в календаре</p>
              </div>
            </div>
            <div className="admin-chips">
              {FILTERS.map((f) => (
                <button
                  key={f.id || "all"}
                  type="button"
                  className={`admin-chip${filter === f.id ? " is-active" : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {bookings.length === 0 && (
              <div className="admin-empty">Заявок в этом фильтре нет</div>
            )}
            {bookings.map((b) => (
              <article key={b.id} className="admin-card">
                <div className="admin-card__top">
                  <div>
                    <h3 className="admin-card__title">
                      №{b.id} · {b.guest_name}
                    </h3>
                    <p className="admin-card__meta">
                      {b.category_name}
                      <br />
                      {b.check_in} → {b.check_out} · {b.guests} гост. · {b.phone}
                    </p>
                    <p className="admin-card__price">
                      {Number(b.total_price).toLocaleString("ru-RU")} ₽{" "}
                      <span
                        className={`admin-badge admin-badge--${b.status}`}
                        style={{ marginLeft: 6 }}
                      >
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                    </p>
                    {b.comment && (
                      <p className="admin-card__meta">💬 {b.comment}</p>
                    )}
                  </div>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--ok"
                      disabled={b.status === "confirmed"}
                      onClick={() => setStatus(b.id, "confirmed")}
                    >
                      Подтвердить
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--warn"
                      disabled={b.status === "paid"}
                      onClick={() => setStatus(b.id, "paid")}
                    >
                      Оплачено
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--bad"
                      disabled={b.status === "rejected"}
                      onClick={() => setStatus(b.id, "rejected")}
                    >
                      Отклонить
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      disabled={b.status === "cancelled"}
                      onClick={() => setStatus(b.id, "cancelled")}
                    >
                      Отменить
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {tab === "blocks" && (
          <section>
            <div className="admin-section-head">
              <div>
                <h2>Календарь · закрытие номеров</h2>
                <p>
                  В ячейке «свободно/вместимость». Можно закрыть{" "}
                  <strong>все</strong> номера на день (клик) или оставить только{" "}
                  <strong>N номеров</strong> на период (форма ниже).
                </p>
              </div>
            </div>

            <div className="admin-card">
              <label className="admin-field">
                Категория номера
                <select
                  value={blockRoom}
                  onChange={(e) => setBlockRoom(e.target.value)}
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="admin-cal-nav">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => shiftMonth(-1)}
                >
                  ←
                </button>
                <h3 className="admin-cal-nav__title">
                  {MONTH_NAMES[calMonth - 1]} {calYear}
                  {calLoading ? " …" : ""}
                </h3>
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => shiftMonth(1)}
                >
                  →
                </button>
              </div>

              <div className="admin-cal__legend">
                <span>
                  <i className="admin-cal__dot admin-cal__dot--free" /> свободно
                </span>
                <span>
                  <i className="admin-cal__dot admin-cal__dot--partial" />{" "}
                  часть занята (бронь)
                </span>
                <span>
                  <i className="admin-cal__dot admin-cal__dot--busy" />{" "}
                  занято бронью
                </span>
                <span>
                  <i className="admin-cal__dot admin-cal__dot--blocked" />{" "}
                  закрыто вручную
                </span>
              </div>

              <div className="admin-cal">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="admin-cal__head">
                    {w}
                  </div>
                ))}
                {Array.from({ length: calFirstWd }).map((_, i) => (
                  <button
                    key={`pad-${i}`}
                    type="button"
                    className="admin-cal__day"
                    disabled
                  />
                ))}
                {calDays.map((d) => {
                  const num = Number(d.day.slice(8, 10));
                  const occ = d.occupied ?? Math.max(0, d.capacity - d.free);
                  let tag = `${d.free}/${d.capacity}`;
                  if (d.status === "blocked") tag = "закрыто";
                  else if (d.status === "busy") tag = `бронь ${occ}`;
                  else if (d.status === "partial") tag = `бронь ${occ}`;
                  return (
                    <button
                      key={d.day}
                      type="button"
                      className={`admin-cal__day is-${d.status}`}
                      disabled={blockBusy}
                      title={
                        d.blocked
                          ? "Клик — открыть дату"
                          : d.status === "busy" || d.status === "partial"
                            ? "Есть бронь. Клик — дополнительно закрыть вручную"
                            : "Клик — закрыть дату"
                      }
                      onClick={() => onCalDayClick(d)}
                    >
                      <span className="admin-cal__num">{num}</span>
                      <span className="admin-cal__tag">{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="admin-section-head">
              <div>
                <h2>Закрыть количество номеров на даты</h2>
                <p>
                  Пример: в категории {selectedRoomTotal || "N"} номеров —
                  оставьте доступными 3, тогда 2 будут закрыты на выбранный
                  период. Гости увидят меньше свободных мест в календаре.
                </p>
              </div>
            </div>

            <div className="admin-card">
              <div className="admin-block-form">
                <label className="admin-field" style={{ marginBottom: 0 }}>
                  С даты
                  <input
                    type="date"
                    value={blockFrom}
                    onChange={(e) => setBlockFrom(e.target.value)}
                  />
                </label>
                <label className="admin-field" style={{ marginBottom: 0 }}>
                  По дату
                  <input
                    type="date"
                    value={blockTo}
                    onChange={(e) => setBlockTo(e.target.value)}
                  />
                </label>
                <label className="admin-field" style={{ marginBottom: 0 }}>
                  Доступно номеров
                  <input
                    type="number"
                    min={0}
                    max={selectedRoomTotal || 99}
                    value={invAvailable}
                    onChange={(e) =>
                      setInvAvailable(Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </label>
              </div>
              <p className="admin-hint" style={{ marginTop: 12 }}>
                В категории сейчас: <strong>{selectedRoomTotal}</strong> номеров.
                {selectedRoomTotal > 0 && (
                  <>
                    {" "}
                    При «доступно {invAvailable}» будет закрыто{" "}
                    <strong>
                      {Math.max(0, selectedRoomTotal - invAvailable)}
                    </strong>
                    .
                  </>
                )}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  disabled={blockBusy}
                  onClick={() => runInventory("set")}
                >
                  Применить лимит на период
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  disabled={blockBusy}
                  onClick={() => runInventory("clear")}
                >
                  Сбросить лимит (все номера)
                </button>
              </div>
            </div>

            <div className="admin-section-head">
              <div>
                <h2>Закрыть полностью (все номера)</h2>
                <p>
                  Полная блокировка дат — ни один номер категории нельзя
                  забронировать. Клик по дню в календаре делает то же самое.
                </p>
              </div>
            </div>

            <div className="admin-card">
              <div className="admin-block-form">
                <label className="admin-field" style={{ marginBottom: 0 }}>
                  С даты
                  <input
                    type="date"
                    value={blockFrom}
                    onChange={(e) => setBlockFrom(e.target.value)}
                  />
                </label>
                <label className="admin-field" style={{ marginBottom: 0 }}>
                  По дату
                  <input
                    type="date"
                    value={blockTo}
                    onChange={(e) => setBlockTo(e.target.value)}
                  />
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    disabled={blockBusy}
                    onClick={() => runBlock("block")}
                  >
                    Закрыть всё на период
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost"
                    disabled={blockBusy}
                    onClick={() => runBlock("unblock")}
                  >
                    Снять полную блокировку
                  </button>
                </div>
              </div>
            </div>

            <div className="admin-section-head">
              <div>
                <h2>Лимиты по количеству</h2>
              </div>
            </div>
            {inventoryRows.length === 0 ? (
              <div className="admin-empty">
                Нет дней с урезанным числом номеров
              </div>
            ) : (
              <div className="admin-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Категория</th>
                      <th>Доступно</th>
                      <th>Закрыто</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryRows.map((row) => (
                      <tr key={`${row.category_id}-${row.day}`}>
                        <td>{row.day}</td>
                        <td>{row.category_name}</td>
                        <td>
                          {row.rooms_available}
                          {row.total_rooms != null
                            ? ` / ${row.total_rooms}`
                            : ""}
                        </td>
                        <td>{row.closed_rooms ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="admin-section-head">
              <div>
                <h2>Полные блокировки</h2>
              </div>
            </div>
            {blocks.length === 0 ? (
              <div className="admin-empty">Нет полностью закрытых дат</div>
            ) : (
              <div className="admin-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Категория</th>
                      <th>Причина</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocks.map((b) => (
                      <tr key={b.id}>
                        <td>{b.day}</td>
                        <td>{b.category_name}</td>
                        <td>{b.reason || "closed"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === "rooms" && (
          <section>
            <div className="admin-section-head">
              <div>
                <h2>Номера</h2>
                <p>Базовая цена и количество мест</p>
              </div>
            </div>
            {rooms.map((r) => (
              <RoomEditor key={r.id} room={r} onSave={saveRoom} />
            ))}
          </section>
        )}

        {tab === "prices" && (
          <section>
            <div className="admin-section-head">
              <div>
                <h2>Цены по месяцам</h2>
                <p>Сезонные цены для расчёта брони</p>
              </div>
            </div>
            <div className="admin-card">
              <label className="admin-field">
                Категория
                <select
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
              <div className="admin-grid-prices">
                {MONTHS.map((label, i) => {
                  const m = String(i + 1);
                  return (
                    <label key={m} className="admin-field">
                      {label}
                      <input
                        type="number"
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
                className="admin-btn admin-btn--primary"
                onClick={savePrices}
              >
                Сохранить цены
              </button>
            </div>
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
    <div className="admin-card">
      <h3 className="admin-card__title">{room.name}</h3>
      <div className="admin-grid-3" style={{ marginTop: "0.85rem" }}>
        <label className="admin-field">
          Базовая цена
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </label>
        <label className="admin-field">
          Всего номеров
          <input
            type="number"
            value={total}
            onChange={(e) => setTotal(Number(e.target.value))}
          />
        </label>
        <label className="admin-field">
          Свободно
          <input
            type="number"
            value={avail}
            onChange={(e) => setAvail(Number(e.target.value))}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={saving}
        className="admin-btn admin-btn--primary"
        style={{ marginTop: "0.75rem" }}
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
