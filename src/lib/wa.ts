export const WA_NUMBER = "79184092279";

export const WA_BOOK_HREF =
  "https://wa.me/79184092279?text=" +
  encodeURIComponent(
    "Здравствуйте! Хочу забронировать отдых в гостевом доме «Серафинна».\n\n" +
      "Серафинна — гостевой дом в Джубге с видом на море\n" +
      "Панорамный вид на бухту, уютные номера, парковка и Wi‑Fi. Рейтинг 4.9.\n\n" +
      "https://www.serafinna.ru/"
  );

export function formatPrice(n: number): string {
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}
