import { StepProgress } from "prokat";

// Счётчик собранных блоков формы размещения — не валидация, а «сколько от тебя
// ещё хотят». Сервер всё равно проверит.

export const Middle = () => (
  <div className="w-[420px]">
    <StepProgress title="Сдаём вещь" done={2} total={4} />
  </div>
);

export const Start = () => (
  <div className="w-[420px]">
    <StepProgress title="Сдаём вещь" done={0} total={4} />
  </div>
);

export const Done = () => (
  <div className="w-[420px]">
    <StepProgress title="Правим объявление" done={4} total={4} />
  </div>
);
