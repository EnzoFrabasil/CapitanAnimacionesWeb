import { describe, expect, it } from "vitest";
import { accesoPermitido, crearTokenSesion, estadoAuth, passwordCorrecta, tokenValido } from "./sesion";

const SECRETO = "x".repeat(32);
const env = (extra: Record<string, string | undefined>) => ({ NODE_ENV: "production", ...extra }) as NodeJS.ProcessEnv;
const activo = env({ ADMIN_PASSWORD: "timón-123", SESSION_SECRET: SECRETO });

describe("estadoAuth", () => {
  it("sin contraseña: abierto en desarrollo, bloqueado en producción", () => {
    expect(estadoAuth(env({ NODE_ENV: "development" }))).toBe("abierto");
    expect(estadoAuth(env({}))).toBe("bloqueado");
  });

  it("con contraseña pero sin secreto válido queda bloqueado (también en desarrollo)", () => {
    expect(estadoAuth(env({ ADMIN_PASSWORD: "a" }))).toBe("bloqueado");
    expect(estadoAuth(env({ NODE_ENV: "development", ADMIN_PASSWORD: "a", SESSION_SECRET: "corto" }))).toBe("bloqueado");
  });

  it("con contraseña y secreto está activo", () => {
    expect(estadoAuth(activo)).toBe("activo");
  });
});

describe("passwordCorrecta", () => {
  it("acepta solo la contraseña exacta", () => {
    expect(passwordCorrecta("timón-123", activo)).toBe(true);
    expect(passwordCorrecta("timón-12", activo)).toBe(false);
    expect(passwordCorrecta("", activo)).toBe(false);
    expect(passwordCorrecta("timón-123", env({}))).toBe(false);
  });
});

describe("token de sesión", () => {
  it("es válido hasta que vence", () => {
    const ahora = 1_000_000;
    const token = crearTokenSesion(ahora, activo);
    expect(tokenValido(token, ahora + 1000, activo)).toBe(true);
    expect(tokenValido(token, ahora + 13 * 3600 * 1000, activo)).toBe(false);
  });

  it("rechaza tokens alterados o firmados con otro secreto", () => {
    const token = crearTokenSesion(Date.now(), activo);
    const [vence, firma] = token.split(".");
    expect(tokenValido(`${Number(vence) + 1}.${firma}`, Date.now(), activo)).toBe(false);
    expect(tokenValido(`${vence}.${firma}x`, Date.now(), activo)).toBe(false);
    expect(tokenValido(token, Date.now(), { ...activo, SESSION_SECRET: "y".repeat(32) })).toBe(false);
    expect(tokenValido(undefined, Date.now(), activo)).toBe(false);
    expect(tokenValido("basura", Date.now(), activo)).toBe(false);
  });
});

describe("accesoPermitido", () => {
  it("depende del estado y del token", () => {
    expect(accesoPermitido(undefined, env({ NODE_ENV: "development" }))).toBe(true);
    expect(accesoPermitido(undefined, env({}))).toBe(false);
    expect(accesoPermitido(undefined, activo)).toBe(false);
    expect(accesoPermitido(crearTokenSesion(Date.now(), activo), activo)).toBe(true);
  });
});
