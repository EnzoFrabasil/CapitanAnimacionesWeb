import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { hashToken, nuevoToken, pareceToken } from "./claves";
import { permisosDeRol, type Permiso } from "./permisos";
import { COOKIE_SESION, DURACION_SESION_SEGUNDOS } from "./sesion";

// Capa de acceso del panel: quién es el usuario de la sesión y qué puede hacer.
// Cada página, acción y API del panel llama a exigirPermiso (o exigirUsuario).

export interface UsuarioSesion {
  id: number;
  email: string;
  nombre: string;
  rol: { id: number; nombre: string; esTotal: boolean };
  permisos: ReadonlySet<Permiso>;
  debeCambiarPassword: boolean;
}

/** Usuario de la sesión actual, o null. Se consulta una sola vez por request. */
export const usuarioActual = cache(async (): Promise<UsuarioSesion | null> => {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!pareceToken(token)) return null;
  const sesion = await prisma.sesion.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      vence: true,
      usuario: {
        select: {
          id: true,
          email: true,
          nombre: true,
          activo: true,
          debeCambiarPassword: true,
          rol: { select: { id: true, nombre: true, esTotal: true, permisos: true } },
        },
      },
    },
  });
  if (!sesion || sesion.vence <= new Date() || !sesion.usuario.activo) return null;
  const { rol, activo: _activo, ...usuario } = sesion.usuario;
  return { ...usuario, rol: { id: rol.id, nombre: rol.nombre, esTotal: rol.esTotal }, permisos: permisosDeRol(rol) };
});

/**
 * Exige una sesión válida (si no, al login). Si la contraseña la eligió otra
 * persona, manda a cambiarla antes de seguir (salvo en la pantalla de cambio).
 */
export async function exigirUsuario({ permitirCambioPendiente = false } = {}): Promise<UsuarioSesion> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/admin/login");
  if (usuario.debeCambiarPassword && !permitirCambioPendiente) redirect("/admin/cuenta");
  return usuario;
}

/** Exige un permiso: sin sesión va al login; sin el permiso, a la pantalla "sin acceso". */
export async function exigirPermiso(permiso: Permiso): Promise<UsuarioSesion> {
  const usuario = await exigirUsuario();
  if (!usuario.permisos.has(permiso)) redirect(`/admin/sin-acceso?permiso=${encodeURIComponent(permiso)}`);
  return usuario;
}

/** Para APIs: el usuario si tiene el permiso, o null (la API responde 401/403). */
export async function usuarioConPermiso(permiso: Permiso): Promise<UsuarioSesion | null> {
  const usuario = await usuarioActual();
  return usuario && !usuario.debeCambiarPassword && usuario.permisos.has(permiso) ? usuario : null;
}

/** Abre una sesión nueva para el usuario y guarda la cookie. */
export async function abrirSesion(usuarioId: number): Promise<void> {
  const { token, hash } = nuevoToken();
  const vence = new Date(Date.now() + DURACION_SESION_SEGUNDOS * 1000);
  await prisma.$transaction([
    // Limpieza de paso: sesiones vencidas de cualquier usuario.
    prisma.sesion.deleteMany({ where: { vence: { lte: new Date() } } }),
    prisma.sesion.create({ data: { tokenHash: hash, usuarioId, vence } }),
    prisma.usuario.update({ where: { id: usuarioId }, data: { ultimoIngreso: new Date() } }),
  ]);
  (await cookies()).set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_SEGUNDOS,
  });
}

/** Cierra la sesión actual (la borra de la base y del navegador). */
export async function cerrarSesionActual(): Promise<void> {
  const almacen = await cookies();
  const token = almacen.get(COOKIE_SESION)?.value;
  if (pareceToken(token)) await prisma.sesion.deleteMany({ where: { tokenHash: hashToken(token) } });
  almacen.delete(COOKIE_SESION);
}

/** Cierra todas las sesiones de un usuario (al desactivarlo o cambiarle la contraseña). */
export async function cerrarSesionesDe(usuarioId: number, salvoActual = false): Promise<void> {
  const token = salvoActual ? (await cookies()).get(COOKIE_SESION)?.value : undefined;
  await prisma.sesion.deleteMany({
    where: { usuarioId, ...(pareceToken(token) ? { NOT: { tokenHash: hashToken(token) } } : {}) },
  });
}
