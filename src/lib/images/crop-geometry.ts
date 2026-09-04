/* Геометрия квадратного кадра для аватарки. Чистая математика без DOM:
 * кроппер живёт в браузере, а проверять на границах нужно именно это.
 *
 * Модель. Вьюпорт — квадрат стороной `viewport`. Картинка вписана в него «по
 * обложке» (меньшая сторона ровно закрывает вьюпорт) и дальше приближается
 * зумом. Положение задаётся сдвигом центра картинки относительно центра
 * вьюпорта, в пикселях вьюпорта, — так же, как это делает CSS-transform,
 * которым кроппер её и двигает.
 *
 * Сдвиг всегда ограничен так, чтобы картинка закрывала вьюпорт целиком: щель
 * по краю означала бы прозрачную полосу в готовой аватарке. */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export interface CropView {
  /** Натуральные размеры декодированного источника. */
  imageWidth: number;
  imageHeight: number;
  /** Сторона квадратного вьюпорта в его же пикселях. */
  viewport: number;
  /** 1 — вписано по обложке; дальше — приближение. */
  zoom: number;
  /** Сдвиг центра картинки от центра вьюпорта, в пикселях вьюпорта. */
  offsetX: number;
  offsetY: number;
}

/** Прямоугольник в пикселях исходника — аргументы sx/sy/sw/sh для drawImage. */
export interface CropRect {
  sx: number;
  sy: number;
  /** Сторона: кадр квадратный по построению. */
  size: number;
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Масштаб при zoom = 1: меньшая сторона картинки закрывает вьюпорт ровно. */
export function baseScale(imageWidth: number, imageHeight: number, viewport: number): number {
  const side = Math.min(imageWidth, imageHeight);
  // Нулевые размеры сюда доехать не должны, но деление на ноль дало бы
  // Infinity и молча испортило бы весь дальнейший счёт.
  if (side <= 0) return 1;
  return viewport / side;
}

function scaleOf(view: CropView): number {
  return baseScale(view.imageWidth, view.imageHeight, view.viewport) * clampZoom(view.zoom);
}

/** Предельный сдвиг по каждой оси. Ноль означает «эта сторона впритык». */
export function maxOffset(view: CropView): { x: number; y: number } {
  const scale = scaleOf(view);
  return {
    // Округление вниз до нуля: на стороне, которая вписана впритык, разность
    // получается микроскопически отрицательной из-за плавающей точки.
    x: Math.max(0, (view.imageWidth * scale - view.viewport) / 2),
    y: Math.max(0, (view.imageHeight * scale - view.viewport) / 2),
  };
}

/** Сдвиг, при котором картинка ещё закрывает вьюпорт целиком. */
export function clampOffset(view: CropView): { x: number; y: number } {
  const max = maxOffset(view);
  const clamp = (v: number, limit: number) =>
    Number.isFinite(v) ? Math.min(limit, Math.max(-limit, v)) : 0;
  return { x: clamp(view.offsetX, max.x), y: clamp(view.offsetY, max.y) };
}

/* Что именно вырезать из исходника. Сдвиг здесь пережимается ещё раз: кроппер
 * держит его в границах сам, но эта функция — единственное место, которое
 * решает, какие пиксели уедут в файл, и полагаться на дисциплину вызывающего
 * тут нельзя. */
export function cropRect(view: CropView): CropRect {
  const scale = scaleOf(view);
  const { x, y } = clampOffset(view);
  const size = view.viewport / scale;

  const raw = {
    sx: view.imageWidth / 2 - (view.viewport / 2 + x) / scale,
    sy: view.imageHeight / 2 - (view.viewport / 2 + y) / scale,
  };

  // Выход за край источника drawImage не ошибка — он вернул бы прозрачные
  // полосы. Кадр меньше картинки по построению, так что зажимаем без потерь.
  return {
    sx: Math.min(Math.max(0, raw.sx), Math.max(0, view.imageWidth - size)),
    sy: Math.min(Math.max(0, raw.sy), Math.max(0, view.imageHeight - size)),
    size,
  };
}
