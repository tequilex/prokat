// Общая база для полей ввода: цвета из токенов и охряное кольцо фокуса — то же,
// что у кнопок (см. button.tsx). Без явного стиля браузер рисует системное кольцо:
// на iOS оно голубое и к теме отношения не имеет.
//
// Размеры, скругления и отступы остаются на месте использования — они разные
// у формы входа (pill), кабинета и фильтров.
// Кольцо внутреннее (ring-inset), а не наружное с отступом, как у кнопок:
// поля тянутся на всю ширину, и внешнее кольцо обрезалось краем модалки —
// ModalContent прокручивается, а значит и обрезает по обеим осям.
export const field =
  "border border-border bg-background text-foreground " +
  "focus-visible:[outline:none] focus-visible:border-ring " +
  "focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset";
