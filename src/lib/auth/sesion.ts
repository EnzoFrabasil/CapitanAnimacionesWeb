import { pareceToken } from "./claves";

// Cookie de sesión del panel: solo contiene un token al azar. La sesión, el
// usuario y sus permisos se buscan en la base (src/lib/auth/usuario.ts).

export const COOKIE_SESION = "capitan_admin";
export const DURACION_SESION_SEGUNDOS = 7 * 24 * 60 * 60;

/**
 * Chequeo rápido para el proxy (sin ir a la base): ¿la cookie tiene forma de
 * token? Cada página, acción y API del panel vuelve a validar la sesión de verdad.
 */
export const pareceSesion = (token: string | undefined): boolean => pareceToken(token);
