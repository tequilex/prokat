import { Brackets } from "@/components/brand/Brackets";
import { cn } from "@/lib/utils";

/* Пустое состояние: служебный знак-скобки и строка объяснения по центру
 * отведённого места.
 *
 * min-h нужен из-за высокого футера: без него текст липнет к шапке, а под ним
 * до самого подвала остаётся дыра. С ним пустая страница читается намеренной.
 * svh, а не vh — на мобиле vh считается по окну без адресной строки. */
export function EmptyState({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-[45svh] flex-col items-center justify-center gap-4 px-4 text-center", className)}>
      {/* Цвет свой у знака — охра (см. Brackets). Анимация только на появление:
        * проявиться и чуть подрасти, один раз. Бегущий блик из `running`
        * читался бы загрузкой, а грузить тут нечего — страница уже пустая. */}
      <Brackets
        size={36}
        className="animate-in fade-in-0 zoom-in-95 duration-500 motion-reduce:animate-none"
      />
      <p className="max-w-sm text-muted-foreground">{children}</p>
    </div>
  );
}
