import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// next/image валидирует remotePatterns даже под jsdom. Тестам нужен голый <img>.
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => React.createElement("img", props),
}));

const env = process.env as Record<string, string | undefined>;
env.NODE_ENV ??= "test";
env.DATABASE_URL ??= "postgres://app:test@localhost:5432/app";
env.NEXTAUTH_URL ??= "http://localhost:3000";
env.NEXTAUTH_SECRET ??= "x".repeat(32);

// jsdom не реализует ResizeObserver, а на нём держится AutoHeight (плавная
// смена высоты карточки входа). Заглушки достаточно: тесты проверяют разметку,
// а не реальные размеры.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
