import { FormBlock } from "prokat";

// Смысловой блок формы размещения: заголовок, подсказка и поля внутри.
// Форма выкладки — свиток из таких блоков, а не пошаговый визард.

const FIELD =
  "border border-border bg-background text-foreground h-11 rounded-md px-3 " +
  "focus-visible:[outline:none] focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset";

export const WithFields = () => (
  <div className="w-[420px]">
    <FormBlock title="Что сдаёте" hint="название видят в поиске">
      <label className="flex flex-col gap-1 text-sm">
        Название
        <input className={FIELD} defaultValue="Перфоратор Bosch GBH 2-26" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Категория
        <select className={FIELD} defaultValue="tools">
          <option value="tools">Инструменты</option>
          <option value="sport">Спорт</option>
        </select>
      </label>
    </FormBlock>
  </div>
);

export const WithoutHint = () => (
  <div className="w-[420px]">
    <FormBlock title="Как вас увидят покупатели">
      <label className="flex flex-col gap-1 text-sm">
        Имя
        <input className={FIELD} placeholder="Например, ПрокатМастер" />
      </label>
    </FormBlock>
  </div>
);
