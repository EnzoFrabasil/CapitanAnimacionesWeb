"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hashParaEmailInexistente, verificarPassword } from "@/lib/auth/claves";
import { permisosDeRol, seccionInicial } from "@/lib/auth/permisos";
import { abrirSesion, cerrarSesionActual, usuarioActual } from "@/lib/auth/usuario";
import { prisma } from "@/lib/prisma";
import { crearRateLimit, ipDeRequest } from "@/lib/rate-limit";
import { registrar } from "@/lib/registro/servidor";

const permitirIntento = crearRateLimit({ maximo: 10, ventanaMs: 15 * 60 * 1000 });
/** Intentos fallidos seguidos por email (contados en el registro) antes de frenar 15 minutos. */
const MAXIMO_FALLIDOS_POR_EMAIL = 8;
const MENSAJE_INCORRECTO = "Email o contraseña incorrectos.";

/** Solo se vuelve a rutas internas del panel (evita redirecciones abiertas). */
function destinoSeguro(desde: FormDataEntryValue | null): string | null {
  return typeof desde === "string" && /^\/admin(\/|$|\?)/.test(desde) && !desde.startsWith("/admin/login") ? desde : null;
}

export async function iniciarSesion(_previo: string | null, formData: FormData): Promise<string | null> {
  if (!permitirIntento(ipDeRequest(await headers()))) {
    return "Demasiados intentos. Esperá unos minutos y probá de nuevo.";
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return MENSAJE_INCORRECTO;

  const fallidos = await prisma.registro.count({
    where: { accion: "login.fallido", entidadId: email, fecha: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
  });
  if (fallidos >= MAXIMO_FALLIDOS_POR_EMAIL) {
    await registrar({ accion: "login.bloqueado", entidad: "usuario", entidadId: email }, null);
    return "Demasiados intentos con ese email. Esperá 15 minutos y probá de nuevo.";
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, activo: true, rol: { select: { esTotal: true, permisos: true } } },
  });
  // Se verifica igual cuando el email no existe, para que tarde lo mismo.
  const correcta = await verificarPassword(password, usuario?.passwordHash ?? (await hashParaEmailInexistente()));
  if (!usuario || !correcta || !usuario.activo) {
    await registrar(
      {
        accion: "login.fallido",
        entidad: "usuario",
        entidadId: email,
        detalle: { motivo: !usuario ? "email inexistente" : !correcta ? "contraseña incorrecta" : "usuario desactivado" },
      },
      null,
    );
    return MENSAJE_INCORRECTO;
  }

  await abrirSesion(usuario.id);
  await registrar({ accion: "login.ok", entidad: "usuario", entidadId: usuario.id }, usuario);
  redirect(destinoSeguro(formData.get("desde")) ?? seccionInicial(permisosDeRol(usuario.rol)));
}

export async function cerrarSesion(): Promise<void> {
  const usuario = await usuarioActual();
  if (usuario) await registrar({ accion: "logout", entidad: "usuario", entidadId: usuario.id }, usuario);
  await cerrarSesionActual();
  redirect("/admin/login");
}
