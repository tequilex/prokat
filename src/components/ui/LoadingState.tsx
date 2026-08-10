import { content } from "@theme/content";
import { Brackets } from "@/components/brand/Brackets";
import { BracketsHandoff } from "@/components/brand/BracketsHandoff";
import { cn } from "@/lib/utils";

/* Ожидание. Спиннеров в системе нет.
 *
 * Блочный вид — переход на другую страницу: скобки «выдают вещь», перебирая,
 * что можно взять рядом. Строчный — короткое ожидание в строке: между скобками
 * ходит блик, слов там негде показать. */
export function LoadingState({
  title = content.loading.title,
  hint,
  inline = false,
  className,
}: {
  title?: string;
  hint?: string;
  inline?: boolean;
  className?: string;
}) {
  if (inline) {
    return (
      <span role="status" className={cn("inline-flex items-center gap-2.5", className)}>
        <Brackets size={18} running />
        <span className="text-sm text-muted-foreground">{title}</span>
      </span>
    );
  }

  return (
    <div role="status" className={cn("flex flex-col items-center justify-center gap-5 py-16 text-center", className)}>
      <BracketsHandoff />
      <div>
        <div className="font-display text-lg font-bold">{title}</div>
        {hint && <div className="mt-0.5 text-sm text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}
