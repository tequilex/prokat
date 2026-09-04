// Server component. Inlines a schema.org object as a <script type="application/ld+json">.
//
// JSON.stringify экранирует кавычки, но НЕ трогает `<`. А в объект попадают
// строки, которые пишет пользователь: заголовок объявления, описание, имя
// продавца. Премодерации нет, объявление публикуется сразу active — значит
// заголовок вида `</script><script>…` закрыл бы тег и весь хвост браузер
// разобрал бы как разметку. Отсюда экранирование ниже.
//
// Необходим здесь строго `<`: содержимое <script> — raw text, ссылки на
// символы (&lt;) в нём не декодируются, поэтому закрыть тег можно только
// буквальным `<`. `>` и `&` экранируются заодно, вреда от них нет.
// U+2028/U+2029 не нужны: тип содержимого — application/ld+json, его читает
// JSON-парсер, а не движок JS. Если это экранирование когда-нибудь
// переиспользуют для инлайнового скрипта, их придётся добавить.

import type { JsonLd as LdObject } from "@/lib/jsonld";

// < внутри JSON-строки — тот же символ после JSON.parse, поэтому данные
// не портятся: робот поисковика видит исходный текст.
function serialize(data: LdObject): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function JsonLd({ data }: { data: LdObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}
