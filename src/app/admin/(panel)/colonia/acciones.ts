"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { exito, fallo, falloPorExcepcion, type ResultadoAccion } from "@/lib/admin/resultado";
import { COOKIE_TEMPORADA } from "@/lib/admin/temporadaPanel";
import { exigirPermiso } from "@/lib/auth/usuario";
import { lugaresLibres } from "@/lib/dominio/cupos";
import { asignarGrupo } from "@/lib/dominio/edad";
import { prisma } from "@/lib/prisma";
import { diferencias, sinSecretos } from "@/lib/registro/diferencias";
import { registrar } from "@/lib/registro/servidor";
import {
  cupoTemporadaSchema,
  datosTemporadaSchema,
  edadesTemporadaSchema,
  mensajesDeError,
  preciosTemporadaSchema,
  semanaSchema,
} from "@/lib/validacion/admin";
import { gruposTemporadaSchema } from "@/lib/validacion/grupos";

type Previo = ResultadoAccion | null;

export async function crearTemporada(_previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  const usuario = await exigirPermiso("configuracion.editar");
  const r = datosTemporadaSchema.safeParse(Object.fromEntries(datos));
  if (!r.success) return fallo(...mensajesDeError(r.error));
  let id: number;
  try {
    // Arranca con las edades por defecto y la inscripción cerrada.
    id = (await prisma.temporada.create({ data: { ...r.data, ...edadesTemporadaSchema.parse({}), inscripcionAbierta: false } })).id;
  } catch (e) {
    return falloPorExcepcion(e);
  }
  await registrar({ accion: "temporada.crear", entidad: "temporada", entidadId: id, detalle: sinSecretos(r.data) }, usuario);
  // La temporada nueva pasa a ser la que se mira en el panel, y se sigue cargando sus fechas.
  (await cookies()).set(COOKIE_TEMPORADA, String(id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 365 * 24 * 60 * 60,
  });
  redirect("/admin/colonia/fechas");
}

/** Guarda una parte de la temporada (cada sección del panel edita la suya) y la registra. */
async function guardarParteTemporada<T extends Record<string, unknown>>(
  id: number,
  esquema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: Parameters<typeof mensajesDeError>[0] } },
  datos: FormData,
  mensaje: string,
): Promise<ResultadoAccion> {
  const usuario = await exigirPermiso("configuracion.editar");
  const r = esquema.safeParse(Object.fromEntries(datos));
  if (!r.success) return fallo(...mensajesDeError(r.error));
  let antes;
  try {
    antes = await prisma.temporada.findUnique({ where: { id } });
    if (!antes) return fallo("La temporada ya no existe. Recargá la página.");
    await prisma.temporada.update({ where: { id }, data: r.data });
  } catch (e) {
    return falloPorExcepcion(e);
  }
  await registrar(
    { accion: "temporada.editar", entidad: "temporada", entidadId: id, detalle: { temporada: antes.nombre, cambios: diferencias(antes, r.data) } },
    usuario,
  );
  refresh();
  return exito(mensaje);
}

export async function guardarDatosTemporada(id: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  return guardarParteTemporada(id, datosTemporadaSchema, datos, "Temporada guardada.");
}

export async function guardarCupo(id: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  return guardarParteTemporada(id, cupoTemporadaSchema, datos, "Cupo guardado.");
}

export async function guardarEdades(id: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  return guardarParteTemporada(id, edadesTemporadaSchema, datos, "Edades guardadas.");
}

/** Abre o cierra la inscripción. Solo puede haber una temporada abierta: al abrir una se cierran las demás. */
export async function cambiarInscripcion(id: number, abrir: boolean): Promise<ResultadoAccion> {
  const usuario = await exigirPermiso("configuracion.editar");
  try {
    if (abrir) {
      // Con el cupo completo la primera inscripción la volvería a cerrar: primero hay que subir el cupo.
      const temporada = await prisma.temporada.findUnique({ where: { id }, select: { cupo: true } });
      const ocupados = await prisma.inscripcionNino.count({
        where: { estado: { not: "CANCELADO" }, inscripcion: { temporadaId: id } },
      });
      if (lugaresLibres(temporada?.cupo ?? null, ocupados) === 0) {
        return fallo(
          `El cupo está completo (${ocupados} de ${temporada?.cupo} lugares ocupados). Subí el cupo en "Datos" o cancelá inscriptos para poder abrirla.`,
        );
      }
    }
    await prisma.$transaction([
      ...(abrir ? [prisma.temporada.updateMany({ where: { id: { not: id } }, data: { inscripcionAbierta: false } })] : []),
      prisma.temporada.update({ where: { id }, data: { inscripcionAbierta: abrir } }),
    ]);
  } catch (e) {
    return falloPorExcepcion(e);
  }
  await registrar({ accion: abrir ? "inscripcion.abrir" : "inscripcion.cerrar", entidad: "temporada", entidadId: id }, usuario);
  refresh();
  return exito(abrir ? "Inscripción abierta." : "Inscripción cerrada.");
}

export async function guardarSemana(
  temporadaId: number,
  semanaId: number | null,
  _previo: Previo,
  datos: FormData,
): Promise<ResultadoAccion> {
  const usuario = await exigirPermiso("configuracion.editar");
  const r = semanaSchema.safeParse(Object.fromEntries(datos));
  if (!r.success) return fallo(...mensajesDeError(r.error));
  let antes = null;
  let id = semanaId;
  try {
    if (semanaId) {
      antes = await prisma.semana.findUnique({ where: { id: semanaId } });
      await prisma.semana.update({ where: { id: semanaId, temporadaId }, data: r.data });
    } else {
      id = (await prisma.semana.create({ data: { ...r.data, temporadaId } })).id;
    }
  } catch (e) {
    return falloPorExcepcion(e, { unico: `Ya hay otra opción con el orden ${r.data.numero}. Usá otro número.` });
  }
  await registrar(
    {
      accion: semanaId ? "opcion.editar" : "opcion.crear",
      entidad: "opcion",
      entidadId: id ?? undefined,
      detalle: antes ? { opcion: antes.nombre, cambios: diferencias(antes, r.data) } : sinSecretos(r.data),
    },
    usuario,
  );
  refresh();
  return exito(semanaId ? "Opción guardada." : "Opción agregada.");
}

/** Precios generales, descuento por hermanos y días sueltos. */
export async function guardarPrecios(temporadaId: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  const usuario = await exigirPermiso("configuracion.editar");
  const r = preciosTemporadaSchema.safeParse(Object.fromEntries(datos));
  if (!r.success) return fallo(...mensajesDeError(r.error));
  let antes;
  try {
    antes = await prisma.temporada.findUnique({ where: { id: temporadaId } });
    await prisma.temporada.update({ where: { id: temporadaId }, data: r.data });
  } catch (e) {
    return falloPorExcepcion(e);
  }
  await registrar(
    { accion: "precios.editar", entidad: "temporada", entidadId: temporadaId, detalle: { cambios: diferencias(antes ?? {}, r.data) } },
    usuario,
  );
  refresh();
  return exito("Precios guardados.");
}

export async function eliminarSemana(semanaId: number): Promise<ResultadoAccion> {
  const usuario = await exigirPermiso("configuracion.editar");
  let borrada;
  try {
    borrada = await prisma.semana.delete({ where: { id: semanaId } });
  } catch (e) {
    return falloPorExcepcion(e, { enUso: "No se puede borrar: hay niños inscriptos en esa opción. Desactivala en su lugar." });
  }
  await registrar({ accion: "opcion.eliminar", entidad: "opcion", entidadId: semanaId, detalle: sinSecretos(borrada) }, usuario);
  refresh();
  return exito("Opción eliminada.");
}

/**
 * Guarda la lista completa de grupos de la temporada (crea, modifica y borra).
 * NO reasigna a los niños ya inscriptos; los de un grupo borrado quedan "sin grupo".
 */
export async function guardarGrupos(temporadaId: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  const usuario = await exigirPermiso("configuracion.editar");
  let crudo: unknown;
  try {
    crudo = JSON.parse(String(datos.get("grupos") ?? "[]"));
  } catch {
    return fallo("No se pudieron leer los grupos.");
  }
  const r = gruposTemporadaSchema.safeParse(crudo);
  if (!r.success) return fallo(...mensajesDeError(r.error));
  const grupos = r.data;

  try {
    const sinGrupoNuevos = await prisma.$transaction(async (tx) => {
      const existentes = await tx.grupoEdad.findMany({ where: { temporadaId }, select: { id: true } });
      const idsExistentes = new Set(existentes.map((g) => g.id));
      if (grupos.some((g) => g.id !== undefined && !idsExistentes.has(g.id))) {
        throw new Error("GRUPO_AJENO");
      }
      const conservados = grupos.flatMap((g) => (g.id !== undefined ? [g.id] : []));
      const borrar = [...idsExistentes].filter((id) => !conservados.includes(id));

      const afectados = await tx.inscripcionNino.count({ where: { grupoEdadId: { in: borrar } } });
      await tx.grupoEdad.deleteMany({ where: { id: { in: borrar } } });

      // Nombres temporales primero, para poder intercambiar nombres sin chocar con el índice único.
      for (const id of conservados) {
        await tx.grupoEdad.update({ where: { id }, data: { nombre: `__tmp_${id}` } });
      }
      for (const g of grupos) {
        const data = { nombre: g.nombre, edadMin: g.edadMin, edadMax: g.edadMax };
        if (g.id !== undefined) await tx.grupoEdad.update({ where: { id: g.id }, data });
        else await tx.grupoEdad.create({ data: { ...data, temporadaId } });
      }
      return afectados;
    });
    await registrar(
      {
        accion: "grupos.editar",
        entidad: "temporada",
        entidadId: temporadaId,
        detalle: { grupos: grupos.map((g) => `${g.nombre} (${g.edadMin} a ${g.edadMax})`), quedaronSinGrupo: sinGrupoNuevos },
      },
      usuario,
    );
    refresh();
    return exito(
      sinGrupoNuevos > 0
        ? `Grupos guardados. ${sinGrupoNuevos} ${sinGrupoNuevos === 1 ? "niño/a quedó" : "niños quedaron"} sin grupo por los grupos borrados.`
        : "Grupos guardados. Los niños ya inscriptos conservan su grupo.",
    );
  } catch (e) {
    if (e instanceof Error && e.message === "GRUPO_AJENO") return fallo("Algún grupo no pertenece a esta temporada. Recargá la página.");
    return falloPorExcepcion(e, { unico: "Hay nombres de grupo repetidos." });
  }
}

/** Asigna grupo (según la edad guardada al inscribir) solo a los niños de la temporada que no tienen. */
export async function asignarSinGrupo(temporadaId: number): Promise<ResultadoAccion> {
  const usuario = await exigirPermiso("inscriptos.editar");
  try {
    const [grupos, sinGrupo] = await Promise.all([
      prisma.grupoEdad.findMany({ where: { temporadaId } }),
      prisma.inscripcionNino.findMany({
        where: { grupoEdadId: null, inscripcion: { temporadaId } },
        select: { id: true, edadAlInscribir: true },
      }),
    ]);
    const asignaciones = sinGrupo.flatMap((n) => {
      const grupo = asignarGrupo(n.edadAlInscribir, grupos);
      return grupo ? [{ id: n.id, grupoEdadId: grupo.id }] : [];
    });
    await prisma.$transaction(
      asignaciones.map((a) =>
        // La condición grupoEdadId: null evita pisar un grupo asignado a mano mientras tanto.
        prisma.inscripcionNino.updateMany({ where: { id: a.id, grupoEdadId: null }, data: { grupoEdadId: a.grupoEdadId } }),
      ),
    );
    await registrar(
      { accion: "grupos.asignar", entidad: "temporada", entidadId: temporadaId, detalle: { asignados: asignaciones.length, sinGrupo: sinGrupo.length } },
      usuario,
    );
    refresh();
    const quedan = sinGrupo.length - asignaciones.length;
    return exito(
      `Se asignó grupo a ${asignaciones.length} de ${sinGrupo.length}.` +
        (quedan > 0 ? ` ${quedan} no entran en ningún rango y siguen sin grupo.` : ""),
    );
  } catch (e) {
    return falloPorExcepcion(e);
  }
}
