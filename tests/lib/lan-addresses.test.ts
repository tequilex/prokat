import { describe, it, expect } from "vitest";
import { devOrigins, lanAddresses } from "@/lib/net/lan-addresses";

describe("dev-origin'ы", () => {
  // lanAddresses отдаёт голые IP — их формат задан next.config.ts, где
  // allowedDevOrigins ждёт именно хосты. Браузер же шлёт Origin со схемой и
  // портом, и сравнение без сборки отвергло бы сокет с телефона.
  it("собирает origin со схемой и портом, а не голый IP", () => {
    expect(devOrigins(["192.168.1.10"], 3000)).toContain("http://192.168.1.10:3000");
  });

  it("localhost и петля всегда в списке — дев без телефона это обычный случай", () => {
    const origins = devOrigins([], 3000);
    expect(origins).toEqual(["http://localhost:3000", "http://127.0.0.1:3000"]);
  });

  it("порт подставляется тот, что дали", () => {
    expect(devOrigins(["10.0.0.2"], 3100)).toContain("http://10.0.0.2:3100");
  });

  it("адреса интерфейсов не содержат петлю: она добавляется отдельно", () => {
    expect(lanAddresses()).not.toContain("127.0.0.1");
  });
});
