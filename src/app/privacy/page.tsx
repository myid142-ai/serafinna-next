import Link from "next/link";

export const metadata = {
  title: "Политика ПДн — Серафинна",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <header className="header scrolled" id="header">
        <div className="container header__inner">
          <Link href="/" className="logo">
            <span className="logo__mark">S</span>
            <span className="logo__text">Serafinna</span>
          </Link>
          <Link className="btn btn--small header__cta" href="/#booking">
            К бронированию
          </Link>
        </div>
      </header>
      <main className="section" style={{ paddingTop: "7rem" }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <Link href="/" style={{ fontWeight: 600 }}>
            ← На главную
          </Link>
          <h1 style={{ fontFamily: "var(--serif)", marginTop: "1rem" }}>
            Политика обработки персональных данных
          </h1>
          <p className="rooms__hint">
            Оператор: Гайдукова Инна, самозанятый гражданин (НПД), гостевой дом
            «Серафинна». Адрес: Краснодарский край, пгт Джубга, ул. Маяковского,
            5А. Тел. +7 (918) 409-22-79.
          </p>
          <p>
            При заявке на бронирование обрабатываются имя, телефон, email (по
            желанию), даты и комментарий — для связи и подтверждения
            бронирования (152‑ФЗ). Данные не продаются. Отзыв согласия — по
            WhatsApp или телефону.
          </p>
          <p style={{ marginTop: "2rem" }}>
            <Link className="btn" href="/#booking">
              Вернуться к бронированию
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
