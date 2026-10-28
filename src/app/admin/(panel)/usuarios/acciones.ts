"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { exito, fallo, falloPorExcepcion, type ResultadoAccion } from "@/lib/admin/resultado";
import { hashearPassword, passwordAleatoria, problemaPassword } from "@/lib/auth/claves";
import { esPermiso } from "@/lib/auth/permisos";
import { cerrarSesionesDe, exigirPermiso, type UsuarioSesion } from "@/lib/auth/usuario";
import { prisma } from "@/lib/prisma";
import { diferencias } from "@/lib/registro/diferencias";
import { registrar } from "@/lib/registro/servidor";
import { mensajesDeError } from "@/lib/validacion/admin";

// Gestión de usuarios y roles: solo para quien tiene "usuarios.gestionar"
// (de entrada, el rol de acceso total). Nunca se guarda ni registra una contraseña en texto.

type Previo = ResultadoAccion | null;

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Email inválido.").max(120, "Email demasiado largo."));
const nombreSchema = z.string().trim().min(1, "Falta el nombre.").max(80, "Hasta 80 caracteres.");
const idSchema = z.coerce.number("Elegí un rol.").int().positive("Elegí un rol.");

/** Quedaría el sistema sin nadie con acceso total activo si este usuario lo pierde? */
async function esUltimoTotal(usuarioId: number): Promise<boolean> {
  const totales = await prisma.usuario.findMany({ where: { activo: true, rol: { esTotal: true } }, select: { id: true } });
  return totales.length === 1 && totales[0].id === usuarioId;
}

/** Contraseña elegida a mano, o una al azar si se dejó vacía. */
function passwordElegida(datos: FormData, email: string): { password: string; generada: boolean } | { error: string } {
  const escrita = String(datos.get("password") ?? "");
  if (!escrita) return { password: passwordAleatoria(), generada: true };
  const problema = problemaPassword(escrita, email);
  return problema ? { error: problema } : { password: escrita, generada: false };
}

const mensajePassword = (p: { password: string; generada: boolean }, base: string) =>
  p.generada ? `${base} Contraseña generada: ${p.password} (copiala ahora, no se vuelve a mostrar).` : base;

export async function crearUsuario(_previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  const yo = await exigirPermiso("usuarios.gestionar");
  const r = z
    .object({ email: emailSchema, nombre: nombreSchema, rolId: idSchema })
    .safeParse({ email: datos.get("email"), nombre: datos.get("nombre"), rolId: datos.get("rolId") });
  if (!r.success) return fallo(...mensajesDeError(r.error));
  const p = passwordElegida(datos, r.data.email);
  if ("error" in p) return fallo(p.error);
  const debeCambiarPassword = datos.get("debeCambiarPassword") === "on";

  try {
    const rol = await prisma.rol.findUnique({ where: { id: r.data.rolId }, select: { nombre: true } });
    if (!rol) return fallo("Ese rol ya no existe. Recargá la página.");
    const nuevo = await prisma.usuario.create({
      data: { ...r.data, passwordHash: await hashearPassword(p.password), debeCambiarPassword },
    });
    await registrar(
      {
        accion: "usuario.crear",
        entidad: "usuario",
        entidadId: nuevo.id,
        detalle: { email: nuevo.email, nombre: nuevo.nombre, rol: rol.nombre, debeCambiarPassword, passwordGenerada: p.generada },
      },
      yo,
    );
  } catch (e) {
    return falloPorExcepcion(e, { unico: "Ya hay un usuario con ese email." });
  }
  refresh();
  return exito(mensajePassword(p, `Usuario ${r.data.email} creado.`));
}

export async function editarUsuario(usuarioId: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  const yo = await exigirPermiso("usuarios.gestionar");
  const r = z
    .object({ email: emailSchema, nombre: nombreSchema, rolId: idSchema })
    .safeParse({ email: datos.get("email"), nombre: datos.get("nombre"), rolId: datos.get("rolId") });
  if (!r.success) return fallo(...mensajesDeError(r.error));

  try {
    const antes = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { email: true, nombre: true, rolId: true, rol: { select: { nombre: true, esTotal: true } } },
    });
    if (!antes) return fallo("El usuario ya no existe. Recargá la página.");
    const rol = await prisma.rol.findUnique({ where: { id: r.data.rolId }, select: { nombre: true, esTotal: true } });
    if (!rol) return fallo("Ese rol ya no existe. Recargá la página.");
    if (antes.rol.esTotal && !rol.esTotal && (await esUltimoTotal(usuarioId))) {
      return fallo("Es el único usuario activo con acceso total: dale acceso total a otra persona antes de cambiarle el rol.");
    }
    await prisma.usuario.update({ where: { id: usuarioId }, data: r.data });
    const cambios = diferencias(
      { email: antes.email, nombre: antes.nombre, rol: antes.rol.nombre },
      { email: r.data.email, nombre: r.data.nombre, rol: rol.nombre },
    );
    if (Object.keys(cambios).length > 0) {
      await registrar(
        { accion: cambios.rol ? "usuario.rol" : "usuario.editar", entidad: "usuario", entidadId: usuarioId, detalle: { usuario: antes.email, cambios } },
        yo,
      );
    }
  } catch (e) {
    return falloPorExcepcion(e, { unico: "Ya hay un usuario con ese email." });
  }
  refresh();
  return exito("Usuario guardado. Los cambios de rol se aplican en su próximo clic.");
}

export async function cambiarActivoUsuario(usuarioId: number, activo: boolean): Promise<ResultadoAccion> {
  const yo = await exigirPermiso("usuarios.gestionar");
  if (!activo && usuarioId === yo.id) return fallo("No podés desactivarte a vos mismo.");
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { email: true } });
    if (!usuario) return fallo("El usuario ya no existe. Recargá la página.");
    if (!activo && (await esUltimoTotal(usuarioId))) return fallo("Es el único usuario activo con acceso total: no se puede desactivar.");
    await prisma.usuario.update({ where: { id: usuarioId }, data: { activo } });
    // Desactivado: se le cierran todas las sesiones al instante.
    if (!activo) await cerrarSesionesDe(usuarioId);
    await registrar({ accion: activo ? "usuario.activar" : "usuario.desactivar", entidad: "usuario", entidadId: usuarioId, detalle: { usuario: usuario.email } }, yo);
  } catch (e) {
    return falloPorExcepcion(e);
  }
  refresh();
  return exito(activo ? "Usuario activado." : "Usuario desactivado: ya no puede entrar.");
}

export async function resetearPassword(usuarioId: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  const yo = await exigirPermiso("usuarios.gestionar");
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { email: true } });
  if (!usuario) return fallo("El usuario ya no existe. Recargá la página.");
  const p = passwordElegida(datos, usuario.email);
  if ("error" in p) return fallo(p.error);
  const debeCambiarPassword = datos.get("debeCambiarPassword") === "on";
  try {
    await prisma.usuario.update({ where: { id: usuarioId }, data: { passwordHash: await hashearPassword(p.password), debeCambiarPassword } });
    // Con la contraseña nueva se cierran las sesiones abiertas (salvo la propia, si se resetea la suya).
    await cerrarSesionesDe(usuarioId, usuarioId === yo.id);
    await registrar(
      { accion: "usuario.password", entidad: "usuario", entidadId: usuarioId, detalle: { usuario: usuario.email, debeCambiarPassword, passwordGenerada: p.generada } },
      yo,
    );
  } catch (e) {
    return falloPorExcepcion(e);
  }
  refresh();
  return exito(mensajePassword(p, `Contraseña de ${usuario.email} cambiada.`));
}

// ── Roles ──────────────────────────────────────────────────────────────────

const permisosDelFormulario = (datos: FormData): string[] => [...new Set(datos.getAll("permisos").map(String).filter(esPermiso))];

async function registrarRol(yo: UsuarioSesion, accion: string, rolId: number, detalle: Record<string, unknown>) {
  await registrar({ accion, entidad: "rol", entidadId: rolId, detalle: JSON.parse(JSON.stringify(detalle)) }, yo);
}

export async function guardarPermisosRol(rolId: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  const yo = await exigirPermiso("usuarios.gestionar");
  const permisos = permisosDelFormulario(datos);
  const nombre = nombreSchema.safeParse(datos.get("nombre"));
  if (!nombre.success) return fallo(...mensajesDeError(nombre.error));
  try {
    const rol = await prisma.rol.findUnique({ where: { id: rolId } });
    if (!rol) return fallo("El rol ya no existe. Recargá la página.");
    if (rol.esTotal) return fallo("El rol de acceso total siempre tiene todos los permisos.");
    await prisma.rol.update({ where: { id: rolId }, data: { nombre: nombre.data, permisos } });
    const agregados = permisos.filter((p) => !rol.permisos.includes(p));
    const quitados = rol.permisos.filter((p) => !permisos.includes(p));
    if (agregados.length || quitados.length || rol.nombre !== nombre.data) {
      await registrarRol(yo, "rol.permisos", rolId, { rol: rol.nombre, nombreNuevo: nombre.data, agregados, quitados });
    }
  } catch (e) {
    return falloPorExcepcion(e);
  }
  refresh();
  return exito("Rol guardado. Los usuarios con este rol ven el cambio en su próximo clic.");
}

export async function crearRol(_previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  const yo = await exigirPermiso("usuarios.gestionar");
  const nombre = nombreSchema.safeParse(datos.get("nombre"));
  if (!nombre.success) return fallo(...mensajesDeError(nombre.error));
  const clave = nombre.data
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!clave) return fallo("Usá un nombre con letras o números.");
  const permisos = permisosDelFormulario(datos);
  try {
    const rol = await prisma.rol.create({ data: { clave, nombre: nombre.data, permisos } });
    await registrarRol(yo, "rol.crear", rol.id, { rol: rol.nombre, permisos });
  } catch (e) {
    return falloPorExcepcion(e, { unico: "Ya hay un rol con ese nombre." });
  }
  refresh();
  return exito(`Rol "${nombre.data}" creado.`);
}

export async function eliminarRol(rolId: number): Promise<ResultadoAccion> {
  const yo = await exigirPermiso("usuarios.gestionar");
  try {
    const rol = await prisma.rol.findUnique({ where: { id: rolId }, include: { _count: { select: { usuarios: true } } } });
    if (!rol) return fallo("El rol ya no existe. Recargá la página.");
    if (rol.esTotal) return fallo("El rol de acceso total no se puede eliminar.");
    if (rol._count.usuarios > 0) return fallo("Hay usuarios con este rol: cambiales el rol antes de eliminarlo.");
    await prisma.rol.delete({ where: { id: rolId } });
    await registrarRol(yo, "rol.eliminar", rolId, { rol: rol.nombre, permisos: rol.permisos });
  } catch (e) {
    return falloPorExcepcion(e);
  }
  refresh();
  return exito("Rol eliminado.");
}
