"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESION, DURACION_SESION_SEGUNDOS, crearTokenSesion, estadoAuth, passwordCorrecta } from "@/lib/auth/sesion";
import { crearRateLimit, ipDeRequest } from "@/lib/rate-limit";

const permitirIntento = crearRateLimit({ maximo: 10, ventanaMs: 15 * 60 * 1000 });

/** Solo se vuelve a rutas internas del panel (evita redirecciones abiertas). */
function destinoSeguro(desde: FormDataEntryValue | null): string {
  return typeof desde === "string" && /^\/admin(\/|$|\?)/.test(desde) && !desde.startsWith("/admin/login")
    ? desde
    : "/admin";
}

export async function iniciarSesion(_previo: string | null, formData: FormData): Promise<string | null> {
  if (estadoAuth() !== "activo") return "El acceso al panel no está configurado.";
  if (!permitirIntento(ipDeRequest(await headers()))) {
    return "Demasiados intentos. Esperá unos minutos y probá de nuevo.";
  }

  const password = formData.get("password");
  if (typeof password !== "string" || !passwordCorrecta(password)) return "Contraseña incorrecta.";

  (await cookies()).set(COOKIE_SESION, crearTokenSesion(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_SEGUNDOS,
  });
  redirect(destinoSeguro(formData.get("desde")));
}

export async function cerrarSesion(): Promise<void> {
  (await cookies()).delete(COOKIE_SESION);
  redirect(estadoAuth() === "abierto" ? "/" : "/admin/login");
}
