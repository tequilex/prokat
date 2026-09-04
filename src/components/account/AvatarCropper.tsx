"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Brackets } from "@/components/brand/Brackets";
import { Button } from "@/components/ui/button";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampOffset,
  clampZoom,
  cropRect,
  type CropView,
} from "@/lib/images/crop-geometry";

/* Кадрирование аватарки в браузере: наружу уходит готовый квадрат, поэтому
 * /api/upload остаётся общей ручкой без режимов — sharp с его fit: "inside"
 * картинку меньше 2560 не трогает.
 *
 * Показ и экспорт идут от ОДНОГО декодированного источника и через один и тот
 * же canvas-путь. Если показывать <img>, а резать ImageBitmap, то на фото с
 * EXIF 90°/270° стороны разойдутся, и в файл уедет не то, что человек видел. */

/** Сторона готовой аватарки. 1024, а не 512: её открывают на весь экран. */
export const AVATAR_SIDE = 1024;

export interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  /** ImageBitmap и objectURL освобождаются руками. */
  release(): void;
}

/* Декодирование с честной ориентацией. Основной путь — createImageBitmap с
 * imageOrientation: "from-image". Запасной — обычный <img>: браузеры применяют
 * EXIF к нему сами (CSS image-orientation: from-image — значение по умолчанию),
 * поэтому запасной путь не хуже, а просто дороже по памяти. */
export async function decodeImage(file: Blob): Promise<DecodedImage> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return {
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        release: () => URL.revokeObjectURL(url),
      };
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
  }
}

type View = Pick<CropView, "zoom" | "offsetX" | "offsetY">;
const START: View = { zoom: MIN_ZOOM, offsetX: 0, offsetY: 0 };

export function AvatarCropper({
  image,
  busy,
  onCancel,
  onDone,
}: {
  image: DecodedImage;
  busy: boolean;
  onCancel: () => void;
  /** Готовый квадрат. Формат — webp либо png, если браузер не умеет webp. */
  onDone: (blob: Blob) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState(0);
  const [view, setView] = useState<View>(START);
  // Новая картинка — новый кадр: иначе зум от прошлой попытки едет следом.
  useEffect(() => setView(START), [image]);

  const full = (v: View): CropView => ({
    imageWidth: image.width,
    imageHeight: image.height,
    viewport,
    ...v,
  });

  /* Единственный сеттер кадра: и перетаскивание, и слайдер, и колесо, и щипок
   * идут через него, поэтому кламп написан один раз. Зум держится за центр
   * вьюпорта — сдвиг умножается на отношение зумов, иначе картинка при
   * приближении уползала бы к своему центру.
   *
   * Зум принимает и функцию: колесо крутится быстрее, чем идут перерисовки, и
   * от числа два события внутри одного кадра схлопнулись бы в один шаг. */
  const apply = useCallback((next: {
    zoom?: number | ((z: number) => number);
    offsetX?: number;
    offsetY?: number;
  }) => {
    setView((prev) => {
      const asked = typeof next.zoom === "function" ? next.zoom(prev.zoom) : next.zoom;
      const zoom = asked === undefined ? prev.zoom : clampZoom(asked);
      const k = prev.zoom === 0 ? 1 : zoom / prev.zoom;
      const draft: View = {
        zoom,
        offsetX: next.offsetX === undefined ? prev.offsetX * k : next.offsetX,
        offsetY: next.offsetY === undefined ? prev.offsetY * k : next.offsetY,
      };
      const { x, y } = clampOffset({
        imageWidth: image.width,
        imageHeight: image.height,
        viewport,
        ...draft,
      });
      return { zoom, offsetX: x, offsetY: y };
    });
  }, [image.width, image.height, viewport]);

  // Сторона вьюпорта — из вёрстки, а не из константы: контейнер резиновый.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => setViewport(box.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  /* Показ. Рисуем в canvas тем же drawImage, что и экспорт.
   *
   * Через requestAnimationFrame, а не сразу: перетаскивание сыплет
   * pointermove чаще, чем экран успевает обновиться, а каждая отрисовка — это
   * полноразмерный битмап с imageSmoothingQuality: "high". Отмена кадра в
   * cleanup и есть склейка — до экрана доезжает только последнее состояние. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewport === 0) return;
    const raf = requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Чёткость на ретине: пиксельный размер холста больше css-размера. Выше
      // 2 не поднимаем — это уже лишняя работа на каждом кадре жеста.
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const px = Math.round(viewport * dpr);
      // Присваивание width/height пересоздаёт буфер, поэтому только при
      // реальной смене размера, а не на каждое движение пальца.
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewport, viewport);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const scale = (viewport / Math.min(image.width, image.height)) * view.zoom;
      const w = image.width * scale;
      const h = image.height * scale;
      ctx.drawImage(image.source, viewport / 2 - w / 2 + view.offsetX, viewport / 2 - h / 2 + view.offsetY, w, h);
    });
    return () => cancelAnimationFrame(raf);
  }, [image, view, viewport]);

  /* Колесо. Слушатель вешаем руками: React регистрирует wheel на корне
   * пассивно, и preventDefault() из onWheel не сработал бы — страница
   * прокручивалась бы под курсором вместе с зумом. */
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      apply({ zoom: (z) => z * (e.deltaY < 0 ? 1.12 : 1 / 1.12) });
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, [apply]);

  /* Указатели: один — перетаскивание, два — щипок. Держим их в ref, а не в
   * state: между pointermove перерисовка не нужна, нужен только кадр. */
  const drag = useRef<{
    points: Map<number, { x: number; y: number }>;
    startView: View;
    startCenter: { x: number; y: number };
    startSpread: number;
  }>({ points: new Map(), startView: START, startCenter: { x: 0, y: 0 }, startSpread: 0 });

  const spread = (pts: Map<number, { x: number; y: number }>) => {
    const [a, b] = [...pts.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const center = (pts: Map<number, { x: number; y: number }>) => {
    const list = [...pts.values()];
    const sum = list.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / list.length, y: sum.y / list.length };
  };
  const rebase = () => {
    const d = drag.current;
    d.startView = view;
    d.startCenter = center(d.points);
    d.startSpread = spread(d.points);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (busy) return;
    const d = drag.current;
    if (d.points.size >= 2) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    d.points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    rebase();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.points.has(e.pointerId)) return;
    d.points.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const now = center(d.points);
    const zoom = d.points.size >= 2 && d.startSpread > 0
      ? d.startView.zoom * (spread(d.points) / d.startSpread)
      : d.startView.zoom;
    // Сдвиг считается от начала жеста, а не приращениями: так он не копит
    // ошибку и не «плывёт», когда кламп упирает картинку в край.
    const k = clampZoom(zoom) / d.startView.zoom;
    apply({
      zoom,
      offsetX: d.startView.offsetX * k + (now.x - d.startCenter.x),
      offsetY: d.startView.offsetY * k + (now.y - d.startCenter.y),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.points.delete(e.pointerId)) return;
    // Палец сняли, второй остался — жест продолжается от новой точки отсчёта.
    if (d.points.size > 0) rebase();
  };

  /* Защёлка на время кодирования. toBlob асинхронен, а busy поднимает уже
   * родитель — из onDone. Между нажатием и первым байтом ответа кнопка живая,
   * и второй клик успел бы отправить вторую загрузку: лишний объект в S3,
   * который проект никогда не удаляет. */
  const exporting = useRef(false);

  const save = () => {
    if (exporting.current || busy) return;
    exporting.current = true;
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIDE;
    canvas.height = AVATAR_SIDE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      exporting.current = false;
      return;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const rect = cropRect(full(view));
    ctx.drawImage(image.source, rect.sx, rect.sy, rect.size, rect.size, 0, 0, AVATAR_SIDE, AVATAR_SIDE);
    // Тип не проверяем: Safari без webp молча отдаёт png, а png ручка
    // принимает и сама приводит к webp, сохраняя прозрачность.
    canvas.toBlob((blob) => {
      exporting.current = false;
      if (blob) onDone(blob);
    }, "image/webp", 0.95);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={boxRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        /* touch-action: none обязателен — окно на мобиле это лист снизу с
         * собственной прокруткой, и без него палец скроллил бы лист вместо
         * перетаскивания, а щипок зумил бы страницу. */
        className="relative mx-auto aspect-square w-full max-w-[320px] cursor-grab touch-none select-none overflow-hidden rounded-lg bg-muted overscroll-contain active:cursor-grabbing"
      >
        <canvas
          ref={canvasRef}
          style={{ width: viewport || undefined, height: viewport || undefined }}
          className="block"
        />
        {/* Круглая маска: затемнение снаружи круга нарисовано его же тенью. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgb(0_0_0/0.55)] ring-1 ring-inset ring-white/60"
        />
      </div>

      <label className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Масштаб</span>
        {/* h-11, а не высота дорожки: ползунок — основной способ приблизить
          * кадр и единственный доступный с клавиатуры, и попадать по нему на
          * телефоне надо пальцем. Браузер центрирует дорожку в этой высоте
          * сам, поэтому вид не меняется, а зона нажатия становится 44px. */}
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={view.zoom}
          disabled={busy}
          aria-label="Масштаб"
          onChange={(e) => apply({ zoom: Number(e.target.value) })}
          className="h-11 min-w-0 flex-1 cursor-pointer accent-primary focus-visible:[outline:none] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
      </label>

      <p className="text-xs text-muted-foreground">
        Перетащите фотографию, чтобы выбрать кадр. Масштаб — ползунком, щипком
        двумя пальцами или колесом мыши.
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Отмена
        </Button>
        <Button onClick={save} disabled={busy || viewport === 0}>
          {busy && <Brackets size={12} running className="mr-2 text-current" />}
          {busy ? "Сохраняем…" : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}
