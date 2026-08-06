"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatPrice, WA_BOOK_HREF } from "@/lib/wa";

type RoomDTO = {
  id: string;
  name: string;
  description: string;
  price: number;
  min_price?: number;
  price_from?: number;
  total_rooms: number;
  available_rooms: number;
};

type CalDay = {
  day: string;
  free: number;
  capacity: number;
  price: number;
  status: "free" | "partial" | "busy" | "blocked";
};

/**
 * Photos always from Vercel CDN host — custom domain path often truncates
 * large JPEGs mid-transfer on some RU networks/VPN.
 */
const ASSET_HOST = (
  process.env.NEXT_PUBLIC_ASSET_HOST || "https://serafinna.vercel.app"
).replace(/\/$/, "");

function assetUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${ASSET_HOST}${p}`;
}

const ROOM_PHOTOS: Record<string, string[]> = {
  "double-sea": Array.from({ length: 7 }, (_, i) =>
    assetUrl(`/images/rooms/double-sea/${String(i + 1).padStart(2, "0")}.jpg`)
  ),
  "apartments-2br": Array.from({ length: 7 }, (_, i) =>
    assetUrl(`/images/rooms/apartments-2br/${String(i + 1).padStart(2, "0")}.jpg`)
  ),
  family: Array.from({ length: 7 }, (_, i) =>
    assetUrl(`/images/rooms/family/${String(i + 1).padStart(2, "0")}.jpg`)
  ),
};

const GALLERY = Array.from({ length: 35 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return assetUrl(`/images/photo-${n}.jpg`);
});

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

export function SiteLanding({ initialRooms }: { initialRooms: RoomDTO[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [rooms] = useState(initialRooms);
  const [galleryCount, setGalleryCount] = useState(12);
  const [mapVisible, setMapVisible] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);

  // room lightbox
  const [lbOpen, setLbOpen] = useState(false);
  const [lbPhotos, setLbPhotos] = useState<string[]>([]);
  const [lbIdx, setLbIdx] = useState(0);

  // calendar (inside booking — for selected room)
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calDays, setCalDays] = useState<CalDay[]>([]);
  const [calFirstWd, setCalFirstWd] = useState(0);
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError] = useState("");
  const [bookTab, setBookTab] = useState<"form" | "calendar">("form");

  // booking
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [categoryId, setCategoryId] = useState(rooms[0]?.id || "double-sea");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(2);
  const [comment, setComment] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [compare, setCompare] = useState<
    { id: string; name: string; total_price?: number; can_book?: boolean; min_available?: number }[]
  >([]);
  const [status, setStatus] = useState("");
  const [statusOk, setStatusOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [privacyOk, setPrivacyOk] = useState(false);

  // room card main photo index
  const [roomMain, setRoomMain] = useState<Record<string, number>>({
    "double-sea": 0,
    "apartments-2br": 0,
    family: 0,
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Yandex map iframe is heavy on mobile — mount only when section is near viewport
  useEffect(() => {
    const el = mapRef.current;
    if (!el || mapVisible) return;
    if (typeof IntersectionObserver === "undefined") {
      setMapVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setMapVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "240px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mapVisible]);

  const loadCalendar = useCallback(async () => {
    setCalLoading(true);
    setCalError("");
    try {
      const q = new URLSearchParams({
        year: String(calYear),
        month: String(calMonth),
        category_id: categoryId,
      });
      const res = await fetch(`/api/calendar?${q}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Ошибка календаря (${res.status})`);
      const list = Array.isArray(data.days) ? data.days : [];
      if (!list.length) {
        throw new Error("Сервер вернул пустой календарь");
      }
      setCalDays(list);
      setCalFirstWd(Number(data.first_weekday) || 0);
    } catch (e) {
      setCalDays([]);
      setCalError(e instanceof Error ? e.message : "Календарь недоступен");
    } finally {
      setCalLoading(false);
    }
  }, [calYear, calMonth, categoryId]);

  // Load calendar when guest opens the calendar tab or changes room/month
  useEffect(() => {
    if (bookTab === "calendar") void loadCalendar();
  }, [bookTab, loadCalendar]);

  const refreshQuote = useCallback(async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setQuoteText("");
      setCompare([]);
      return;
    }
    const q = new URLSearchParams({
      category_id: categoryId,
      check_in: checkIn,
      check_out: checkOut,
    });
    const [quoteRes, cmpRes] = await Promise.all([
      fetch(`/api/quote?${q}`),
      fetch(
        `/api/compare?check_in=${encodeURIComponent(checkIn)}&check_out=${encodeURIComponent(checkOut)}`
      ),
    ]);
    const quote = await quoteRes.json();
    const cmp = await cmpRes.json();
    if (quoteRes.ok && quote.can_book) {
      setQuoteText(
        `${quote.nights} ноч. · ${formatPrice(quote.total_price)} (ср. ${formatPrice(quote.avg_price)}/ночь)`
      );
    } else {
      setQuoteText(quote.reason || quote.error || "Недоступно на эти даты");
    }
    if (cmpRes.ok) setCompare(cmp.categories || []);
  }, [checkIn, checkOut, categoryId]);

  useEffect(() => {
    refreshQuote().catch(() => null);
  }, [refreshQuote]);

  function openLightbox(photos: string[], idx = 0) {
    setLbPhotos(photos);
    setLbIdx(idx);
    setLbOpen(true);
  }

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function onCalDayClick(day: string, status: CalDay["status"]) {
    if (status === "busy" || status === "blocked" || day < todayIso) return;
    // 1-й клик: заезд + выезд +1 ночь; 2-й клик (позже): выезд
    if (!checkIn || (checkIn && checkOut) || day <= checkIn) {
      setCheckIn(day);
      const next = new Date(day + "T12:00:00");
      next.setDate(next.getDate() + 1);
      setCheckOut(next.toISOString().slice(0, 10));
    } else {
      setCheckOut(day);
    }
    setBookTab("form");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    setStatusOk(false);

    if (!categoryId) {
      setStatus("Выберите категорию номера");
      return;
    }
    if (!checkIn || !checkOut) {
      setStatus("Укажите даты заезда и выезда — удобнее во вкладке «Календарь»");
      setBookTab("calendar");
      return;
    }
    if (checkOut <= checkIn) {
      setStatus("Дата выезда должна быть позже даты заезда");
      return;
    }
    if (!guestName.trim()) {
      setStatus("Укажите имя");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setStatus("Укажите телефон (не менее 10 цифр)");
      return;
    }
    if (!privacyOk) {
      setStatus("Нужно согласие на обработку персональных данных");
      return;
    }

    setLoading(true);
    const payload = {
      category_id: categoryId,
      guest_name: guestName.trim(),
      phone: phone.trim(),
      email: (email || "").trim(),
      check_in: checkIn,
      check_out: checkOut,
      guests,
      comment: (comment || "").trim(),
    };

    async function postBooking(attempt: number): Promise<Response> {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      try {
        return await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
          cache: "no-store",
        });
      } catch (e) {
        if (attempt < 1) {
          // one retry — flaky .ru / VPN paths drop the first POST
          await new Promise((r) => setTimeout(r, 600));
          return postBooking(attempt + 1);
        }
        throw e;
      } finally {
        clearTimeout(timer);
      }
    }

    try {
      const res = await postBooking(0);
      let data: {
        error?: string;
        id?: number;
        total_price?: number;
        category_name?: string;
      } = {};
      try {
        data = await res.json();
      } catch {
        setStatus(
          `Сервер ответил некорректно (${res.status}). Напишите в WhatsApp: +7 (918) 409-22-79`
        );
        return;
      }
      if (!res.ok) {
        setStatus(data.error || `Не удалось отправить (${res.status})`);
        return;
      }

      const roomName =
        data.category_name ||
        rooms.find((r) => r.id === categoryId)?.name ||
        "";
      const params = new URLSearchParams();
      if (data.id != null) params.set("id", String(data.id));
      if (data.total_price != null) params.set("total", String(data.total_price));
      params.set("check_in", checkIn);
      params.set("check_out", checkOut);
      if (roomName) params.set("room", roomName);
      const successUrl = `/booking/success?${params.toString()}`;

      // Hard navigation is more reliable than router.push when the network
      // path is flaky (soft nav can fail after a successful booking).
      try {
        window.location.assign(successUrl);
      } catch {
        setStatusOk(true);
        setStatus(
          `Заявка №${data.id} принята${
            data.total_price
              ? ` · ориентир ${Number(data.total_price).toLocaleString("ru-RU")} ₽`
              : ""
          }. Мы свяжемся с вами.`
        );
      }
      return;
    } catch (e) {
      const aborted =
        e instanceof DOMException && e.name === "AbortError";
      setStatus(
        aborted
          ? "Сервер долго не отвечает. Напишите в WhatsApp: +7 (918) 409-22-79"
          : "Сеть недоступна. Напишите в WhatsApp: +7 (918) 409-22-79"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className={`header${scrolled ? " scrolled" : ""}`} id="header">
        <div className="container header__inner">
          <a href="#top" className="logo">
            <span className="logo__mark">S</span>
            <span className="logo__text">Serafinna</span>
          </a>
          <nav className={`nav${navOpen ? " is-open" : ""}`} id="nav">
            {[
              ["#about", "О нас"],
              ["#amenities", "Удобства"],
              ["#rooms", "Номера"],
              ["#booking", "Бронь"],
              ["#gallery", "Фото"],
              ["#reviews", "Отзывы"],
              ["#contacts", "Контакты"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setNavOpen(false)}
              >
                {label}
              </a>
            ))}
          </nav>
          <a
            className="btn btn--small header__cta"
            href={WA_BOOK_HREF}
            target="_blank"
            rel="noopener noreferrer"
          >
            Забронировать
          </a>
          <button
            className={`burger${navOpen ? " is-open" : ""}`}
            type="button"
            aria-label="Меню"
            onClick={() => setNavOpen((v) => !v)}
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div
            className="hero__bg"
            style={{
              backgroundImage: `url('${assetUrl("/images/photo-08.jpg")}')`,
            }}
          />
          <div className="hero__overlay" />
          <div className="container hero__content">
            <div className="hero__copy">
              <p className="hero__eyebrow">Гостевой дом · Джубга · Чёрное море</p>
              <h1>Серафинна</h1>
              <p className="hero__lead">
                Тихий дом у моря для семьи и двоих. Панорамный вид на бухту,
                уютные номера, парковка и мангал — как к хорошим людям в гости.
              </p>
              <div className="hero__actions">
                <a
                  className="btn"
                  href={WA_BOOK_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Забронировать в WhatsApp
                </a>
                <a className="btn btn--ghost" href="#booking">
                  Выбрать даты
                </a>
              </div>
              <div className="hero__stats">
                <div className="stat">
                  <strong>4.9</strong>
                  <span>рейтинг на Яндекс Картах</span>
                </div>
                <div className="stat">
                  <strong>241+</strong>
                  <span>отзывов гостей</span>
                </div>
                <div className="stat">
                  <strong>~5 мин</strong>
                  <span>до моря по лестнице</span>
                </div>
              </div>
            </div>

            <aside className="hero__panel" aria-label="Быстрая бронь">
              <h2>Забронировать отдых</h2>
              <p className="hero__panel-lead">
                Ответим днём в течение 2 часов. Можно сразу в WhatsApp или
                оставить заявку с датами.
              </p>
              <ul className="hero__panel-list">
                <li>Цены от 3 200 ₽ / ночь — в календаре</li>
                <li>5 двухместных · 2 апартамента · 2 семейных</li>
                <li>Предоплата за первую ночь · остальное на месте</li>
              </ul>
              <a className="btn" href="#booking">
                Открыть календарь и заявку
              </a>
              <a
                className="btn btn--ghost-dark"
                href={WA_BOOK_HREF}
                target="_blank"
                rel="noopener noreferrer"
              >
                Написать в WhatsApp
              </a>
            </aside>
          </div>
        </section>

        <section className="section about" id="about">
          <div className="container about__grid">
            <div className="about__text">
              <p className="section-label">О гостевом доме</p>
              <h2>Ваш отдых с видом на рассвет над водой</h2>
              <p>
                Гостевой дом <strong>Серафинна</strong> в Джубге — ул.&nbsp;Маяковского, 5А,
                в тихом месте посёлка. С террасы и балконов открывается бухта, пляж
                и холмы побережья — место, куда возвращаются.
              </p>
              <p>
                Здесь удобно семье и паре: кондиционер в номерах, общая кухня,
                закрытая территория, парковка и мангал. До моря — около 5 минут
                по лестнице. Бассейн на территории — платная услуга.
              </p>
              <div className="season-card" role="note">
                <div className="season-card__icon" aria-hidden="true">✦</div>
                <p className="season-card__text">
                  <strong>Высокий сезон (июль–август)</strong> — тёплое море
                  и номера разбирают заранее. Забронируйте даты, чтобы выбрать
                  удобный номер без спешки.
                </p>
              </div>
              <div className="note">
                <strong>Важно:</strong> бронирование — по предоплате за первую ночь
                (невозвратна); остальной срок оплачивается на месте наличными.
              </div>
            </div>
            <div className="about__photos">
              <img src={assetUrl("/images/photo-17.jpg")} alt="Вид на бухту" className="about__img about__img--main" loading="lazy" decoding="async" />
              <img src={assetUrl("/images/photo-24.jpg")} alt="Терраса" className="about__img about__img--side" loading="lazy" decoding="async" />
              <img src={assetUrl("/images/photo-28.jpg")} alt="Территория" className="about__img about__img--side" loading="lazy" decoding="async" />
            </div>
          </div>
        </section>

        <section className="section proof" id="proof">
          <div className="container">
            <p className="section-label">Как это выглядит</p>
            <h2 className="section-title">Фото «на месте» — без сюрпризов</h2>
            <p className="proof__lead">
              Вид с балкона, кухня, мангал, парковка и спуск к морю.
            </p>
            <div className="proof__grid">
              {[
                [assetUrl("/images/photo-14.jpg"), "Вид с балкона на бухту и пляж"],
                [assetUrl("/images/photo-23.jpg"), "Общая кухня — всё для самостоятельного питания"],
                [assetUrl("/images/photo-26.jpg"), "Мангальная зона для вечерних посиделок"],
                [assetUrl("/images/photo-28.jpg"), "Парковка на закрытой территории"],
                [assetUrl("/images/photo-17.jpg"), "Море рядом — спуск к пляжу ~5 минут"],
              ].map(([src, cap]) => (
                <figure className="proof-card" key={src}>
                  <img src={src} alt={cap} loading="lazy" decoding="async" />
                  <figcaption>{cap}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="section amenities" id="amenities">
          <div className="container">
            <p className="section-label">Удобства</p>
            <h2 className="section-title">Всё для комфортного отдыха</h2>
            <div className="amenities__grid">
              {[
                ["🌊", "Рядом с морем", "Спуск к пляжу по лестнице за несколько минут"],
                ["🏞️", "Панорамный вид", "Единственный дом в округе с таким видом на море"],
                ["❄️", "Кондиционер", "Прохлада в номерах даже в жаркий день"],
                ["📶", "Wi‑Fi", "Бесплатный интернет для гостей"],
                ["🅿️", "Парковка", "Бесплатная парковка на территории"],
                ["🧊", "Холодильник", "В номерах и на общей кухне"],
                ["🔥", "Мангальная зона", "Место для шашлыка и вечерних посиделок"],
                ["🏊", "Бассейн", "На территории · платная услуга"],
                ["💳", "Оплата картой", "Удобная безналичная оплата"],
              ].map(([icon, title, text]) => (
                <article className="amenity" key={title}>
                  <div className="amenity__icon">{icon}</div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section rooms" id="rooms">
          <div className="container">
            <p className="section-label">Номера</p>
            <h2 className="section-title">Номера с видом и для семьи</h2>
            <p className="rooms__hint">
              5 двухместных · 2 апартамента · 2 семейных. Нажмите на фото — галерея
              категории
            </p>
            <div className="rooms__grid">
              {rooms.map((room, roomIndex) => {
                const photos = ROOM_PHOTOS[room.id] || [];
                const mainIdx = roomMain[room.id] || 0;
                return (
                  <article className="room-card" key={room.id}>
                    <div className="room-card__media">
                      <button
                        type="button"
                        className="room-card__main"
                        aria-label={`Открыть фото: ${room.name}`}
                        onClick={() => openLightbox(photos, mainIdx)}
                      >
                        <img
                          src={photos[mainIdx] || photos[0]}
                          alt={room.name}
                          loading={roomIndex === 0 ? "eager" : "lazy"}
                          decoding="async"
                          fetchPriority={roomIndex === 0 ? "high" : "low"}
                        />
                        <span className="room-card__count">{photos.length} фото</span>
                      </button>
                      <div className="room-card__thumbs" role="list">
                        {photos.slice(0, 4).map((src, i) => (
                          <button
                            key={src}
                            type="button"
                            className={`room-card__thumb${mainIdx === i ? " is-active" : ""}`}
                            aria-label={`Фото ${i + 1}`}
                            onClick={() =>
                              setRoomMain((m) => ({ ...m, [room.id]: i }))
                            }
                          >
                            <img src={src} alt="" loading="lazy" decoding="async" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="room-card__body">
                      <h3>{room.name}</h3>
                      <p>{room.description}</p>
                      <div className="room-card__meta">
                        <span className="room-price">
                          от {formatPrice(room.min_price ?? room.price)} / ночь
                        </span>
                        <span className="room-availability">
                          Свободные даты — в календаре
                        </span>
                      </div>
                      <a
                        className="btn btn--small room-card__book"
                        href="#booking"
                        onClick={() => {
                          setCategoryId(room.id);
                          setBookTab("calendar");
                        }}
                      >
                        Выбрать даты
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section booking" id="booking">
          <div className="container booking__grid">
            <div>
              <p className="section-label">Бронирование</p>
              <h2>Оставьте заявку на отдых</h2>
              <p className="booking__lead">
                Выберите номер и даты в календаре — сразу увидите цену. Или напишите в WhatsApp.
              </p>
              <ul className="booking__notes">
                <li>Ответим в WhatsApp или звонком в течение 2 часов (днём)</li>
                <li>Бронирование — по предоплате за первую ночь (невозвратна)</li>
                <li>Остальной срок проживания оплачивается на месте наличными</li>
                <li>Высокий сезон (июль–август) — бронируйте заранее</li>
                <li>Можно написать или позвонить без формы</li>
              </ul>
              <div className="booking__contacts">
                <a className="btn" href={WA_BOOK_HREF} target="_blank" rel="noopener noreferrer">
                  Забронировать в WhatsApp
                </a>
                <a className="btn btn--outline" href="tel:+79184092279">
                  Позвонить
                </a>
              </div>
            </div>

            <div className="booking-form booking-form--tabs">
              <div className="booking-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={bookTab === "calendar"}
                  className={`booking-tabs__btn${bookTab === "calendar" ? " is-active" : ""}`}
                  onClick={() => setBookTab("calendar")}
                >
                  1. Календарь
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={bookTab === "form"}
                  className={`booking-tabs__btn${bookTab === "form" ? " is-active" : ""}`}
                  onClick={() => setBookTab("form")}
                >
                  2. Заявка
                </button>
              </div>

              {bookTab === "calendar" && (
                <div className="booking-calendar" role="tabpanel">
                  <label className="booking-calendar__room">
                    Номер
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="avail-nav booking-calendar__nav">
                    <button
                      type="button"
                      className="btn btn--outline btn--small"
                      aria-label="Предыдущий месяц"
                      onClick={() => {
                        if (calMonth === 1) {
                          setCalMonth(12);
                          setCalYear((y) => y - 1);
                        } else setCalMonth((m) => m - 1);
                      }}
                    >
                      ‹
                    </button>
                    <strong>
                      {MONTH_NAMES[calMonth - 1]} {calYear}
                    </strong>
                    <button
                      type="button"
                      className="btn btn--outline btn--small"
                      aria-label="Следующий месяц"
                      onClick={() => {
                        if (calMonth === 12) {
                          setCalMonth(1);
                          setCalYear((y) => y + 1);
                        } else setCalMonth((m) => m + 1);
                      }}
                    >
                      ›
                    </button>
                  </div>
                  <p className="rooms__hint booking-calendar__hint">
                    Нажмите дату заезда, затем дату выезда
                  </p>
                  {calError && (
                    <p className="rooms__hint" style={{ color: "#991b1b" }}>
                      {calError}{" "}
                      <button
                        type="button"
                        className="btn btn--outline btn--small"
                        onClick={() => void loadCalendar()}
                      >
                        Повторить
                      </button>
                    </p>
                  )}
                  {calLoading && (
                    <p className="rooms__hint">Загрузка календаря…</p>
                  )}
                  <div className="cal" aria-live="polite">
                    {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d) => (
                      <div key={d} className="cal__head">
                        {d}
                      </div>
                    ))}
                    {Array.from({ length: calFirstWd }, (_, i) => (
                      <button
                        key={`blank-${i}`}
                        type="button"
                        className="cal__day is-empty"
                        disabled
                        tabIndex={-1}
                        aria-hidden
                      />
                    ))}
                    {calDays.map((cell) => {
                      const past = cell.day < todayIso;
                      const inRange =
                        Boolean(checkIn && checkOut) &&
                        cell.day > checkIn &&
                        cell.day < checkOut;
                      const selected =
                        cell.day === checkIn || cell.day === checkOut;
                      let cls = "cal__day";
                      if (past) cls += " is-past";
                      else if (cell.status === "free") cls += " is-free";
                      else if (cell.status === "partial") cls += " is-partial";
                      else if (cell.status === "blocked") cls += " is-busy";
                      else cls += " is-busy";
                      if (selected) cls += " is-selected";
                      if (inRange) cls += " is-in-range";
                      const dayNum = Number(String(cell.day).slice(8, 10));
                      const title = past
                        ? "Прошедшая дата"
                        : cell.status === "blocked"
                          ? "Закрыто"
                          : cell.status === "busy"
                            ? "Занято (бронь)"
                            : cell.status === "partial"
                              ? `Свободно: ${cell.free} из ${cell.capacity}`
                              : `Свободно · ${formatPrice(Number(cell.price) || 0)}`;
                      return (
                        <button
                          key={cell.day}
                          type="button"
                          className={cls}
                          disabled={
                            past ||
                            cell.status === "busy" ||
                            cell.status === "blocked"
                          }
                          title={title}
                          onClick={() => onCalDayClick(cell.day, cell.status)}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                  <div className="cal-legend">
                    <span>
                      <i className="dot dot--free" /> Свободно
                    </span>
                    <span>
                      <i className="dot dot--partial" /> Мало мест
                    </span>
                    <span>
                      <i className="dot dot--busy" /> Занято
                    </span>
                    <span>
                      <i className="dot dot--past" /> Прошло
                    </span>
                  </div>
                  {checkIn && checkOut && (
                    <div className="booking-calendar__summary">
                      <p>
                        {checkIn} → {checkOut}
                        {quoteText ? ` · ${quoteText}` : ""}
                      </p>
                      <button
                        type="button"
                        className="btn btn--small"
                        onClick={() => setBookTab("form")}
                      >
                        Далее — заявка
                      </button>
                    </div>
                  )}
                </div>
              )}

              {bookTab === "form" && (
                <form onSubmit={onSubmit} role="tabpanel" noValidate>
                  {status && (
                    <p
                      id="booking-status"
                      className={`booking-form__status ${statusOk ? "is-ok" : "is-error"}`}
                      role="status"
                    >
                      {status}
                    </p>
                  )}
                  <label>
                    Категория номера *
                    <select
                      required
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} — от {formatPrice(r.min_price ?? r.price)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="booking-form__row">
                    <label>
                      Заезд *
                      <input
                        type="date"
                        required
                        value={checkIn}
                        min={todayIso}
                        onChange={(e) => setCheckIn(e.target.value)}
                      />
                    </label>
                    <label>
                      Выезд *
                      <input
                        type="date"
                        required
                        value={checkOut}
                        min={checkIn || todayIso}
                        onChange={(e) => setCheckOut(e.target.value)}
                      />
                    </label>
                  </div>
                  {(!checkIn || !checkOut) && (
                    <p className="rooms__hint">
                      Даты не выбраны.{" "}
                      <button
                        type="button"
                        className="booking-form__cal-link"
                        onClick={() => setBookTab("calendar")}
                      >
                        Открыть календарь →
                      </button>
                    </p>
                  )}
                  <button
                    type="button"
                    className="booking-form__cal-link"
                    onClick={() => setBookTab("calendar")}
                  >
                    Открыть календарь занятости →
                  </button>

                  {compare.length > 0 && (
                    <div className="booking-compare">
                      <strong className="booking-compare__title">
                        Сравнение по категориям
                      </strong>
                      <div className="booking-compare__list">
                        {compare.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`booking-compare__item${categoryId === c.id ? " is-active" : ""}${!c.can_book ? " is-busy" : ""}`}
                            onClick={() => setCategoryId(c.id)}
                          >
                            <span>{c.name}</span>
                            <div className="booking-compare__price">
                              {c.can_book
                                ? formatPrice(c.total_price || 0)
                                : "занято"}
                            </div>
                            <span
                              className={`booking-compare__badge ${c.can_book ? "is-ok" : "is-busy"}`}
                            >
                              {c.can_book
                                ? `своб. ${c.min_available}`
                                : "занято"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <label>
                    Имя *
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Как к вам обращаться"
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    Телефон *
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+7 (___) ___-__-__"
                      autoComplete="tel"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="optional@mail.ru"
                      autoComplete="email"
                    />
                  </label>
                  <label>
                    Гостей *
                    <input
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Комментарий
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Пожелания по времени заезда, детской кроватке и т.д."
                    />
                  </label>
                  {quoteText && (
                    <div className="booking-quote">
                      <strong>Расчёт</strong>
                      <p>{quoteText}</p>
                    </div>
                  )}
                  <label className="booking-form__consent">
                    <input
                      type="checkbox"
                      checked={privacyOk}
                      onChange={(e) => setPrivacyOk(e.target.checked)}
                    />
                    <span>
                      Согласен(на) на обработку персональных данных в соответствии
                      с{" "}
                      <Link href="/privacy" target="_blank">
                        политикой ПДн
                      </Link>{" "}
                      и 152‑ФЗ *
                    </span>
                  </label>
                  <button type="submit" className="btn" disabled={loading}>
                    {loading ? "Отправка…" : "Отправить заявку"}
                  </button>
                  <div className="booking-form__alt">
                    <span>Или сразу:</span>
                    <a
                      href={WA_BOOK_HREF}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                    <a href="tel:+79184092279">+7 (918) 409-22-79</a>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        <section className="section gallery" id="gallery">
          <div className="container">
            <p className="section-label">Галерея</p>
            <h2 className="section-title">Фотографии Serafinna</h2>
            <div className="gallery__grid">
              {GALLERY.slice(0, galleryCount).map((src, i) => (
                <button
                  key={src}
                  type="button"
                  className="gallery__item"
                  onClick={() => openLightbox(GALLERY, i)}
                >
                  <img src={src} alt={`Фото ${i + 1}`} loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
            {galleryCount < GALLERY.length && (
              <button
                className="btn btn--outline"
                type="button"
                onClick={() => setGalleryCount((c) => Math.min(c + 12, GALLERY.length))}
              >
                Показать ещё фото
              </button>
            )}
          </div>
        </section>

        <section className="section reviews" id="reviews">
          <div className="container">
            <p className="section-label">Отзывы</p>
            <h2 className="section-title">Что говорят гости</h2>
            <div className="reviews__score">
              <div className="score-big">4.9</div>
              <div>
                <div className="stars" aria-hidden="true">★★★★★</div>
                <p>241 отзыв на Яндекс Картах</p>
                <a
                  href="https://yandex.ru/maps/org/80308445585"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Смотреть все отзывы →
                </a>
              </div>
            </div>
            <div className="reviews__grid">
              {[
                ["Ирина П.", "20 июля 2025", "Отличный гостевой дом: чисто, уютно, приветливая хозяйка Инна. Пляж в шаговой доступности."],
                ["Кирилл М.", "2 июля 2025", "Однозначно 5 звёзд! Вид отличный, номера суперские. Заселились в 3 ночи — отдельное спасибо."],
                ["Елена Иванова", "20 июля 2025", "Номер двухкомнатный, виды шикарные! Чисто, уютно. В бассейне купались. Приедем ещё!"],
                ["Лилия Леманн", "31 марта 2025", "Замечательное место. Прекрасный вид с балкона. Хозяйка дружелюбная и всегда готова помочь."],
              ].map(([name, date, text]) => (
                <article className="review-card" key={name}>
                  <div className="review-card__top">
                    <strong>{name}</strong>
                    <time>{date}</time>
                  </div>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section contacts" id="contacts">
          <div className="container contacts__grid">
            <div>
              <p className="section-label">Контакты</p>
              <h2>Забронируйте отдых</h2>
              <p className="contacts__lead">
                Напишите или позвоните — подберём удобные даты и расскажем о свободных номерах.
              </p>
              <ul className="contact-list">
                <li>
                  <span className="contact-list__label">Адрес</span>
                  <a href="https://yandex.ru/maps/org/80308445585" target="_blank" rel="noopener noreferrer">
                    Краснодарский край, Туапсинский МО,<br />
                    пгт Джубга, ул. Маяковского, 5А
                  </a>
                </li>
                <li>
                  <span className="contact-list__label">Телефон</span>
                  <a href="tel:+79184092279">+7 (918) 409-22-79</a>
                </li>
                <li>
                  <span className="contact-list__label">WhatsApp</span>
                  <a href={WA_BOOK_HREF} target="_blank" rel="noopener noreferrer">
                    Написать сообщение
                  </a>
                </li>
                <li>
                  <span className="contact-list__label">На карте</span>
                  <a
                    href="https://yandex.ru/maps/?rtext=~44.306169,38.706050"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Построить маршрут
                  </a>
                </li>
              </ul>
              <div className="contacts__actions">
                <a className="btn" href={WA_BOOK_HREF} target="_blank" rel="noopener noreferrer">
                  Забронировать в WhatsApp
                </a>
                <a className="btn btn--ghost-dark" href="tel:+79184092279">
                  Позвонить
                </a>
              </div>
            </div>
            <div className="map-wrap" ref={mapRef}>
              {mapVisible ? (
                <iframe
                  title="Карта — гостевой дом Серафинна"
                  src="https://yandex.ru/map-widget/v1/?ll=38.706050%2C44.306169&z=16&pt=38.706050,44.306169,pm2rdm"
                  loading="lazy"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  className="map-wrap__placeholder"
                  onClick={() => setMapVisible(true)}
                  aria-label="Показать карту"
                >
                  Нажмите, чтобы загрузить карту
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <div className="footer__brand">
            <span className="logo__mark">S</span>
            <div>
              <strong>Serafinna</strong>
              <p>Гостевой дом в Джубге</p>
            </div>
          </div>
          <p className="footer__copy">
            © {new Date().getFullYear()} Серафинна · Гайдукова Инна ·{" "}
            <Link href="/privacy">Политика ПДн</Link>
          </p>
          <p className="footer__pay">
            Предоплата за первую ночь · остальное — наличными на месте
          </p>
        </div>
      </footer>

      {lbOpen && (
        <div className="lightbox" role="dialog">
          <button
            className="lightbox__close"
            type="button"
            aria-label="Закрыть"
            onClick={() => setLbOpen(false)}
          >
            ×
          </button>
          <button
            className="lightbox__nav lightbox__nav--prev"
            type="button"
            aria-label="Назад"
            onClick={() =>
              setLbIdx((i) => (i - 1 + lbPhotos.length) % lbPhotos.length)
            }
          >
            ‹
          </button>
          <img src={lbPhotos[lbIdx]} alt="Фото гостевого дома" />
          <button
            className="lightbox__nav lightbox__nav--next"
            type="button"
            aria-label="Вперёд"
            onClick={() => setLbIdx((i) => (i + 1) % lbPhotos.length)}
          >
            ›
          </button>
        </div>
      )}

      <a
        className="whatsapp-float"
        href={WA_BOOK_HREF}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Забронировать в WhatsApp"
      >
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
          <path
            fill="currentColor"
            d="M16.1 3C9.4 3 4 8.3 4 14.9c0 2.1.6 4.1 1.6 5.9L4 29l8.4-1.6c1.7.9 3.6 1.4 5.6 1.4 6.7 0 12.1-5.3 12.1-11.9S22.8 3 16.1 3zm0 21.7c-1.8 0-3.5-.5-5-1.3l-.4-.2-5 1 1-4.8-.2-.4c-1-1.6-1.5-3.4-1.5-5.2 0-5.5 4.6-10 10.2-10s10.2 4.5 10.2 10-4.6 10-10.3 10zm5.6-7.5c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6 0-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.7-1.7-2-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.6-1-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 1.8.8 2.5.8 3.4.7.5-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4 0-.1-.2-.2-.5-.4z"
          />
        </svg>
      </a>
    </>
  );
}
