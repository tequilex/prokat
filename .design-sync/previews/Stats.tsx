import { Stats } from "prokat";

// Метрики кабинета. accent — показатель про предмет и его состояние
// (занятость, просмотры вещей), он идёт охрой по закону цвета.

export const Cabinet = () => (
  <div className="w-[560px]">
    <Stats
      items={[
        { value: 128, label: "просмотров за неделю" },
        { value: 6, label: "заявок за месяц" },
        { value: 4, label: "активных объявлений" },
        { value: 11, label: "дней занято впереди", accent: true },
      ]}
    />
  </div>
);

export const Quiet = () => (
  <div className="w-[560px]">
    <Stats
      items={[
        { value: 0, label: "просмотров за неделю" },
        { value: 0, label: "заявок за месяц" },
        { value: 1, label: "активное объявление" },
        { value: 0, label: "дней занято впереди", accent: true },
      ]}
    />
  </div>
);
