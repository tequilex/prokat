"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Выбранный город — клиентское состояние, живущее поверх навигации.
//
// Сервер знает его из куки и кладёт сюда начальным значением. Держать его
// только на сервере нельзя: провайдер сидит в корневом layout'е, а тот при
// клиентской навигации не перерисовывается — запечённое значение протухло бы
// на первом же переходе после смены города. Держать только на клиенте тоже
// нельзя: при полной загрузке страницы состояния ещё нет, а шапка обязана
// назвать город сразу и тот же, что показывает страница.
//
// Провайдер лежит в layout'е, а не внутри шапки: Header и MobileNav — соседи,
// и таб-бар иначе остался бы со старым городом на вкладке «Каталог».

interface CityPreference {
  slug: string | undefined;
  /**
   * Запомнить выбор на клиенте. Куку пишет server action setCityPreference.
   * Принимает и функцию: откат после неудачи обязан посмотреть на текущее
   * значение, иначе затрёт более свежий выбор.
   */
  choose: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const Context = createContext<CityPreference>({ slug: undefined, choose: () => {} });

export function CityPreferenceProvider({
  initialSlug,
  children,
}: {
  initialSlug: string | undefined;
  children: React.ReactNode;
}) {
  const [slug, setSlug] = useState(initialSlug);

  // Сервер остаётся источником правды. Состояние нужно там, где layout не
  // перерисовывается (обычная навигация), но когда он всё же перерисовался с
  // другим городом — сохранили профиль, вошли, вышли — верно уже серверное
  // значение, и оптимистичный выбор надо им перекрыть. Без этого сохранение
  // «Мой город» меняло бы страницы, но не шапку над ними.
  useEffect(() => { setSlug(initialSlug); }, [initialSlug]);

  return (
    <Context.Provider value={{ slug, choose: setSlug }}>
      {children}
    </Context.Provider>
  );
}

export function useCityPreference(): CityPreference {
  return useContext(Context);
}
