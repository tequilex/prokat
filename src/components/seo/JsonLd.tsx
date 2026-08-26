// Server component. Inlines a schema.org object as a <script type="application/ld+json">.
//
// ВНИМАНИЕ (безопасность): в объект попадают пользовательские строки — название
// и описание объявления, имя продавца, крошки. Голый JSON.stringify для вставки
// в <script> НЕПРИГОДЕН: он не экранирует "<" и "/", поэтому значение вида
// "</script>…" закрыло бы тег и позволило внедрить произвольный <script>
// (stored XSS на карточке товара). Экранируем "<", ">", "&" и разделители строк
// U+2028/U+2029 в \uXXXX. Внутри JSON это валидные escape'ы: JSON.parse у
// потребителя (Google/Яндекс) вернёт исходную строку без искажений.

import type { JsonLd as LdObject } from "@/lib/jsonld";

const HTML_ESCAPE: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

// Экспортируется отдельно от компонента, чтобы security-инвариант можно было
// проверить юнит-тестом без рендера. НЕ заменять на голый JSON.stringify.
export function serializeJsonLd(data: LdObject): string {
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (c) => HTML_ESCAPE[c] ?? c);
}

export function JsonLd({ data }: { data: LdObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
