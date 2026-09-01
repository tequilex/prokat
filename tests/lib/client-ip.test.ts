import { describe, it, expect } from "vitest";
import { clientIp, clientIpFromForwardedFor } from "@/lib/http/client-ip";

function headers(xff?: string): Headers {
  const h = new Headers();
  if (xff !== undefined) h.set("x-forwarded-for", xff);
  return h;
}

describe("clientIp", () => {
  it("takes the last element — the one Caddy appended", () => {
    // Первый элемент подконтролен клиенту: доверие к нему сделало бы лимиты
    // на регистрацию и сброс обходимыми одной подделанной строкой.
    expect(clientIp(headers("1.2.3.4, 5.6.7.8"))).toBe("5.6.7.8");
  });

  it("handles a single value", () => {
    expect(clientIp(headers("5.6.7.8"))).toBe("5.6.7.8");
  });

  it("falls back to local without the header (dev without a proxy)", () => {
    expect(clientIp(headers())).toBe("local");
  });

  it("falls back to local on a blank header", () => {
    expect(clientIp(headers(" , "))).toBe("local");
  });

  // Две реализации одного правила разъехались бы молча: realtime получает
  // IncomingMessage, а не web-Headers.
  it("gives the same answer for a bare string as for Headers", () => {
    for (const xff of ["1.2.3.4, 5.6.7.8", "5.6.7.8", "", "  ,  "]) {
      expect(clientIpFromForwardedFor(xff)).toBe(clientIp(headers(xff)));
    }
    expect(clientIpFromForwardedFor(undefined)).toBe("local");
    expect(clientIpFromForwardedFor(null)).toBe("local");
  });
});
