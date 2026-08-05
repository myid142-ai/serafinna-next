import { formatPrice, WA_BOOK_HREF } from "@/lib/wa";

const ASSET = (
  process.env.NEXT_PUBLIC_ASSET_HOST || "https://serafinna.vercel.app"
).replace(/\/$/, "");

function img(path: string) {
  return `${ASSET}${path.startsWith("/") ? path : `/${path}`}`;
}

type Room = {
  id: string;
  name: string;
  description: string;
  price: number;
  min_price?: number;
};

/**
 * Zero client JS — first HTML stays tiny so LTE+VPN can finish the download.
 * CSS/photos come from vercel.app (works when .ru path stalls large bodies).
 */
export function HomeStatic({ rooms }: { rooms: Room[] }) {
  const roomPhoto: Record<string, string> = {
    "double-sea": img("/images/rooms/double-sea/01.jpg"),
    "apartments-2br": img("/images/rooms/apartments-2br/01.jpg"),
    family: img("/images/rooms/family/01.jpg"),
  };

  return (
    <>
      <header className="header scrolled" id="header">
        <div className="container header__inner">
          <a href="#top" className="logo">
            <span className="logo__mark">S</span>
            <span>Serafinna</span>
          </a>
          <nav className="nav" aria-label="Разделы">
            <a href="#about">О доме</a>
            <a href="#rooms">Номера</a>
            <a href="#booking">Бронь</a>
            <a href="#contacts">Контакты</a>
          </nav>
          <a
            className="btn btn--small header__cta"
            href={WA_BOOK_HREF}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div
            className="hero__bg"
            style={{ backgroundImage: `url('${img("/images/photo-08.jpg")}')` }}
          />
          <div className="hero__overlay" />
          <div className="container hero__content">
            <div className="hero__copy">
              <p className="hero__eyebrow">
                Гостевой дом · Джубга · Чёрное море
              </p>
              <h1>Серафинна</h1>
              <p className="hero__lead">
                Тихий дом у моря для семьи и двоих. Панорамный вид на бухту,
                уютные номера, парковка и мангал.
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
                  Календарь и заявка
                </a>
              </div>
              <div className="hero__stats">
                <div>
                  <strong>4.9</strong>
                  <span>рейтинг</span>
                </div>
                <div>
                  <strong>241+</strong>
                  <span>отзывов</span>
                </div>
                <div>
                  <strong>~5 мин</strong>
                  <span>до моря</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section about" id="about">
          <div className="container about__grid">
            <div>
              <p className="section-label">О гостевом доме</p>
              <h2 className="section-title">Ваш отдых с видом на рассвет</h2>
              <p>
                Гостевой дом <strong>Серафинна</strong> в Джубге — ул.
                Маяковского, 5А. С террасы и балконов — бухта. Кондиционер,
                кухня, парковка, мангал. До моря ~5 минут.
              </p>
              <p>
                <strong>Июль–август</strong> — бронируйте заранее. Предоплата
                за первую ночь; остальное наличными на месте.
              </p>
            </div>
            <div className="about__photos">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img("/images/photo-17.jpg")}
                alt="Вид на бухту"
                className="about__img about__img--main"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </section>

        <section className="section rooms" id="rooms">
          <div className="container">
            <p className="section-label">Номера</p>
            <h2 className="section-title">Номера с видом и для семьи</h2>
            <div className="rooms__grid">
              {rooms.map((room) => (
                <article className="room-card" key={room.id}>
                  <div className="room-card__media">
                    <div className="room-card__main">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={roomPhoto[room.id] || roomPhoto["double-sea"]}
                        alt={room.name}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  </div>
                  <div className="room-card__body">
                    <h3>{room.name}</h3>
                    <p>{room.description}</p>
                    <div className="room-card__meta">
                      <span className="room-price">
                        от {formatPrice(room.min_price ?? room.price)} / ночь
                      </span>
                    </div>
                    <a className="btn btn--small room-card__book" href="/book">
                      Выбрать даты
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section booking" id="booking">
          <div className="container booking__grid">
            <div>
              <p className="section-label">Бронирование</p>
              <h2>Оставьте заявку на отдых</h2>
              <p className="booking__lead">
                На LTE с VPN сначала откроется эта лёгкая страница. Календарь —
                отдельной кнопкой (или сразу WhatsApp).
              </p>
              <ul className="booking__notes">
                <li>Ответим днём в течение 2 часов</li>
                <li>Предоплата — первая ночь (невозвратна)</li>
                <li>Остальное — наличными на месте</li>
              </ul>
              <div className="booking__contacts">
                <a
                  className="btn"
                  href={WA_BOOK_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
                <a className="btn btn--outline" href="tel:+79184092279">
                  +7 (918) 409-22-79
                </a>
              </div>
            </div>
            <div className="booking-form">
              <p style={{ marginTop: 0 }}>
                <strong>Календарь и онлайн-заявка</strong>
              </p>
              <p className="rooms__hint">
                Откроется страница бронирования. Если не грузится — зеркало на
                Vercel:
              </p>
              <p>
                <a className="btn" href="/book">
                  Открыть календарь
                </a>
              </p>
              <p className="rooms__hint">
                Зеркало:{" "}
                <a href="https://serafinna.vercel.app/book">
                  serafinna.vercel.app/book
                </a>
              </p>
            </div>
          </div>
        </section>

        <section className="section contacts" id="contacts">
          <div className="container">
            <p className="section-label">Контакты</p>
            <h2>Забронируйте отдых</h2>
            <ul className="contact-list">
              <li>
                <span className="contact-list__label">Адрес</span>
                <span>
                  Краснодарский край, Туапсинский МО, пгт Джубга, ул.
                  Маяковского, 5А
                </span>
              </li>
              <li>
                <span className="contact-list__label">Телефон</span>
                <a href="tel:+79184092279">+7 (918) 409-22-79</a>
              </li>
              <li>
                <span className="contact-list__label">WhatsApp</span>
                <a href={WA_BOOK_HREF} target="_blank" rel="noopener noreferrer">
                  Написать
                </a>
              </li>
            </ul>
            <div className="contacts__actions">
              <a
                className="btn"
                href={WA_BOOK_HREF}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
              <a className="btn btn--ghost-dark" href="tel:+79184092279">
                Позвонить
              </a>
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
            © {new Date().getFullYear()} Серафинна ·{" "}
            <a href="/privacy">Политика ПДн</a>
            {" · "}
            <a href="/full">Полная версия</a>
          </p>
        </div>
      </footer>

      <a
        className="whatsapp-float"
        href={WA_BOOK_HREF}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
      >
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
          <path
            fill="currentColor"
            d="M16.01 3C9.39 3 4 8.39 4 15.01c0 2.11.55 4.09 1.52 5.82L4 29l8.35-1.51A11.95 11.95 0 0 0 16 27c6.63 0 12-5.37 12-12S22.64 3 16.01 3zm0 21.82c-1.79 0-3.46-.48-4.9-1.32l-.35-.2-4.95.9.93-4.82-.23-.37A9.8 9.8 0 0 1 6.2 15c0-5.42 4.4-9.82 9.82-9.82 5.41 0 9.81 4.4 9.81 9.82 0 5.42-4.4 9.82-9.82 9.82zm5.39-7.16c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.04-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"
          />
        </svg>
      </a>
    </>
  );
}
