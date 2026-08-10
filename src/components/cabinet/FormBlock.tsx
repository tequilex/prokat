/* Смысловой блок формы: заголовок + подсказка, поля внутри. Форма выкладки —
 * один свиток из таких блоков, а не пошаговый визард: заполнять можно в любом
 * порядке и видеть сразу всё, что от тебя хотят. */
export function FormBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface flex flex-col gap-3.5 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
