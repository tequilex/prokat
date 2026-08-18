"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Пробуем оба написания: :autofill стандартный, вебкитовский — для старых
// сборок. Незнакомый селектор кидает SyntaxError — глотаем.
function isAutofilled(el: HTMLInputElement): boolean {
  for (const sel of [":autofill", ":-webkit-autofill"]) {
    try {
      if (el.matches(sel)) return true;
    } catch {
      // jsdom и браузеры без поддержки — просто не сигнал.
    }
  }
  return false;
}

// Поле пароля с глазком: переключатель видимости появляется, только когда в
// поле что-то есть — у пустого поля показывать нечего. className прокидывается
// на сам input (стили полей у форм свои).
export function PasswordInput({ className, onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  // Для неконтролируемого использования наполненность отслеживаем сами;
  // у контролируемого правду знает props.value.
  const [innerFilled, setInnerFilled] = useState(Boolean(props.defaultValue));
  // Автозаполнение браузера не шлёт событий, которые видит React: state пуст,
  // а в поле стоят точки. Поэтому после монтирования спрашиваем браузер напрямую
  // через :autofill — и ещё раз чуть позже: Chrome дозаполняет после загрузки.
  // Заполнение из выпадашки сюда не входит — оно шлёт обычный input.
  const [autofilled, setAutofilled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const check = () => { if (inputRef.current && isAutofilled(inputRef.current)) setAutofilled(true); };
    check();
    // Chrome дозаполняет и после загрузки, без событий — одна перепроверка.
    const t = setTimeout(check, 300);
    return () => clearTimeout(t);
  }, []);
  const filled = autofilled || (props.value !== undefined ? String(props.value).length > 0 : innerFilled);

  const icon = (active: boolean) =>
    cn(
      "absolute inset-0 h-4 w-4 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
      active ? "opacity-100 scale-100" : "opacity-0 scale-50",
    );

  return (
    <div className="relative">
      {/* pr-11 всегда, не только при видимом глазке: иначе текст прыгает,
        * когда кнопка появляется под первым же символом. */}
      <input
        {...props}
        ref={inputRef}
        onChange={(e) => {
          // Человек начал печатать сам — дальше правда за value.
          setAutofilled(false);
          setInnerFilled(e.target.value.length > 0);
          onChange?.(e);
        }}
        type={visible ? "text" : "password"}
        className={cn(className, "w-full pr-11")}
      />
      <button
        type="button"
        aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
        aria-hidden={!filled}
        tabIndex={filled ? 0 : -1}
        onClick={() => setVisible((v) => !v)}
        className={cn(
          "absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground",
          "transition-[opacity,transform] duration-150 ease-out hover:text-foreground motion-reduce:transition-none",
          filled ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-75",
        )}
      >
        {/* Обе иконки в стопке: смена видно/скрыто — перекрёстное растворение
          * с лёгким масштабом, а не мгновенная подмена. */}
        <span className="relative block h-4 w-4">
          <Eye className={icon(!visible)} aria-hidden="true" />
          <EyeOff className={icon(visible)} aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
