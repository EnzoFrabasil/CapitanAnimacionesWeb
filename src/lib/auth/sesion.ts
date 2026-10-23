import { createHmac, timingSafeEqual } from "node:crypto";

// Sesión del panel: una cookie firmada con HMAC-SHA256 (SESSION_SECRET) que
// contiene solo la fecha de vencimiento. Se usa desde el proxy y desde el servidor.

export const COOKIE_SESION = "capitan_admin";
export const DURACION_SESION_SEGUNDOS = 30 * 24 * 60 * 60;
const LARGO_MINIMO_SECRETO = 32;

/**
 * - "activo": hay ADMIN_PASSWORD y SESSION_SECRET; se pide contraseña.
 * - "abierto": falta ADMIN_PASSWORD y NO es producción; se entra sin contraseña.
 * - "bloqueado": falta configuración en producción (o el secreto es inválido); no entra nadie.
 */
export type EstadoAuth = "activo" | "abierto" | "bloqueado";

export function estadoAuth(env: NodeJS.ProcessEnv = process.env): EstadoAuth {
  const password = env.ADMIN_PASSWORD;
  const secreto = env.SESSION_SECRET;
  if (password && secreto && secreto.length >= LARGO_MINIMO_SECRETO) return "activo";
  if (!password && env.NODE_ENV !== "production") return "abierto";
  return "bloqueado";
}

function firmar(secreto: string, texto: string): Buffer {
  return createHmac("sha256", secreto).update(texto).digest();
}

function igualesTiempoConstante(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Compara la contraseña en tiempo constante (sin importar el largo de lo ingresado). */
export function passwordCorrecta(intento: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const password = env.ADMIN_PASSWORD;
  const secreto = env.SESSION_SECRET;
  if (!password || !secreto) return false;
  return igualesTiempoConstante(firmar(secreto, `pw:${intento}`), firmar(secreto, `pw:${password}`));
}

export function crearTokenSesion(ahora = Date.now(), env: NodeJS.ProcessEnv = process.env): string {
  const secreto = env.SESSION_SECRET;
  if (!secreto) throw new Error("Falta SESSION_SECRET");
  const vence = ahora + DURACION_SESION_SEGUNDOS * 1000;
  return `${vence}.${firmar(secreto, `sesion:${vence}`).toString("base64url")}`;
}

export function tokenValido(token: string | undefined, ahora = Date.now(), env: NodeJS.ProcessEnv = process.env): boolean {
  const secreto = env.SESSION_SECRET;
  if (!token || !secreto) return false;
  const [venceTexto, firma, ...resto] = token.split(".");
  if (!venceTexto || !firma || resto.length > 0 || !/^\d+$/.test(venceTexto)) return false;
  if (Number(venceTexto) <= ahora) return false;
  return igualesTiempoConstante(Buffer.from(firma, "base64url"), firmar(secreto, `sesion:${venceTexto}`));
}

/** ¿La request puede entrar al panel? */
export function accesoPermitido(token: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  const estado = estadoAuth(env);
  if (estado === "abierto") return true;
  if (estado === "bloqueado") return false;
  return tokenValido(token, Date.now(), env);
}
