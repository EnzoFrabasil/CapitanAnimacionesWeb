import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Contraseñas y tokens de sesión. Sin dependencias: scrypt viene con Node.

const PARAMETROS = { N: 16384, r: 8, p: 1, largo: 64 } as const;
export const LARGO_MINIMO_PASSWORD = 10;

function derivar(password: string, sal: Buffer, n: number, r: number, p: number, largo: number): Promise<Buffer> {
  const opciones: ScryptOptions = { N: n, r, p, maxmem: 64 * 1024 * 1024 };
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), sal, largo, opciones, (e, clave) => (e ? reject(e) : resolve(clave))),
  );
}

/** "scrypt$N$r$p$sal$hash" (sal y hash en base64url). */
export async function hashearPassword(password: string): Promise<string> {
  const { N, r, p, largo } = PARAMETROS;
  const sal = randomBytes(16);
  const clave = await derivar(password, sal, N, r, p, largo);
  return ["scrypt", N, r, p, sal.toString("base64url"), clave.toString("base64url")].join("$");
}

/** Compara en tiempo constante. Un hash mal formado nunca coincide. */
export async function verificarPassword(password: string, guardado: string): Promise<boolean> {
  const [algoritmo, n, r, p, sal, hash] = guardado.split("$");
  if (algoritmo !== "scrypt" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "base64url");
  const calculado = await derivar(password, Buffer.from(sal, "base64url"), Number(n), Number(r), Number(p), esperado.length);
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

/**
 * Hash de una contraseña que no es de nadie: si el email no existe se verifica
 * contra este, así el login tarda lo mismo y no revela qué emails hay.
 */
let hashSenuelo: Promise<string> | null = null;
export const hashParaEmailInexistente = () => (hashSenuelo ??= hashearPassword(randomBytes(16).toString("hex")));

/** Problema de una contraseña nueva, o null si sirve. */
export function problemaPassword(password: string, email?: string): string | null {
  if (password.length < LARGO_MINIMO_PASSWORD) return `La contraseña tiene que tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`;
  if (password.length > 200) return "La contraseña es demasiado larga.";
  if (email && password.toLowerCase().includes(email.split("@")[0].toLowerCase())) return "La contraseña no puede contener tu email.";
  if (/^(.)\1+$/.test(password) || /^(0123456789|1234567890|qwertyuiop)/i.test(password)) return "Esa contraseña es muy fácil de adivinar.";
  return null;
}

/** Token de sesión para la cookie (al azar) y el hash que se guarda en la base. */
export function nuevoToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("base64url");

/** Forma válida de un token (43 caracteres base64url). Lo usa el proxy, sin ir a la base. */
export const pareceToken = (valor: string | undefined): valor is string => !!valor && /^[A-Za-z0-9_-]{43}$/.test(valor);

/** Contraseña al azar fácil de dictar (sin 0/O ni 1/l), para crear usuarios o resetear. */
export function passwordAleatoria(largo = 14): string {
  const letras = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(largo), (b) => letras[b % letras.length]).join("");
}
