import { describe, expect, it } from "vitest";
import { crearRateLimit, ipDeRequest } from "./rate-limit";

describe("crearRateLimit", () => {
  it("permite hasta el máximo por ventana y se reinicia", () => {
    const permitir = crearRateLimit({ maximo: 2, ventanaMs: 1000 });
    expect(permitir("a", 0)).toBe(true);
    expect(permitir("a", 10)).toBe(true);
    expect(permitir("a", 20)).toBe(false);
    expect(permitir("b", 20)).toBe(true);
    expect(permitir("a", 1000)).toBe(true);
  });
});

describe("ipDeRequest", () => {
  it("toma la primera IP de x-forwarded-for", () => {
    expect(ipDeRequest(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(ipDeRequest(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(ipDeRequest(new Headers())).toBe("desconocida");
  });
});
