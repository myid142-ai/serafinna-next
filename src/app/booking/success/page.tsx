import Link from "next/link";
import { WA_BOOK_HREF } from "@/lib/wa";

type Props = {
  searchParams: Promise<{
    id?: string;
    total?: string;
    check_in?: string;
    check_out?: string;
    room?: string;
  }>;
};

export const metadata = {
  title: "Заявка отправлена — Серафинна",
  robots: { index: false, follow: false },
};

export default async function BookingSuccessPage({ searchParams }: Props) {
  const sp = await searchParams;
  const id = sp.id || "";
  const total = sp.total ? Number(sp.total) : 0;
  const checkIn = sp.check_in || "";
  const checkOut = sp.check_out || "";
  const room = sp.room || "";

  const totalLabel = Number.isFinite(total) && total > 0
    ? `${Math.round(total).toLocaleString("ru-RU")} ₽`
    : "";

  return (
    <>
      <header className="header scrolled" id="header">
        <div className="container header__inner">
          <Link href="/" className="logo">
            <span className="logo__mark">S</span>
            <span className="logo__text">Serafinna</span>
          </Link>
          <Link className="btn btn--small header__cta" href="/">
            На главную
          </Link>
        </div>
      </header>

      <main className="success-page">
        <div className="container success-page__card">
          <div className="success-page__icon" aria-hidden="true">
            ✓
          </div>
          <h1>Заявка отправлена</h1>
          <p className="success-page__lead">
            Спасибо! Мы получили вашу заявку
            {id ? (
              <>
                {" "}
                <strong>№{id}</strong>
              </>
            ) : null}
            . Свяжемся в WhatsApp или по телефону в течение 2 часов (днём).
          </p>

          {(room || checkIn || totalLabel) && (
            <ul className="success-page__details">
              {room ? (
                <li>
                  <span>Номер</span>
                  <strong>{room}</strong>
                </li>
              ) : null}
              {checkIn && checkOut ? (
                <li>
                  <span>Даты</span>
                  <strong>
                    {checkIn} → {checkOut}
                  </strong>
                </li>
              ) : null}
              {totalLabel ? (
                <li>
                  <span>Ориентир по сумме</span>
                  <strong>{totalLabel}</strong>
                </li>
              ) : null}
            </ul>
          )}

          <div className="success-page__actions">
            <Link className="btn" href="/">
              На главную
            </Link>
            <a
              className="btn btn--outline"
              href={WA_BOOK_HREF}
              target="_blank"
              rel="noopener noreferrer"
            >
              Написать в WhatsApp
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
