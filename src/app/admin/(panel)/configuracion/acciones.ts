"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { exito, fallo, falloPorExcepcion, type ResultadoAccion } from "@/lib/admin/resultado";
import { exigirAdmin } from "@/lib/auth/admin";
import { lugaresLibres } from "@/lib/dominio/cupos";
import { asignarGrupo } from "@/lib/dominio/edad";
import { prisma } from "@/lib/prisma";
import { mensajesDeError, preciosTemporadaSchema, semanaSchema, temporadaSchema } from "@/lib/validacion/admin";
import { gruposTemporadaSchema } from "@/lib/validacion/grupos";

type Previo = ResultadoAccion | null;

export async function crearTemporada(_previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  await exigirAdmin();
  const r = temporadaSchema.safeParse(Object.fromEntries(datos));
  if (!r.success) return fallo(...mensajesDeError(r.error));
  let id: number;
  try {
    id = (await prisma.temporada.create({ data: { ...r.data, inscripcionAbierta: false } })).id;
  } catch (e) {
    return falloPorExcepcion(e);
  }
  redirect(`/admin/configuracion/${id}`);
}

export async function actualizarTemporada(id: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  await exigirAdmin();
  const r = temporadaSchema.safeParse(Object.fromEntries(datos));
  if (!r.success) return fallo(...mensajesDeError(r.error));
  try {
    await prisma.temporada.update({ where: { id }, data: r.data });
  } catch (e) {
    return falloPorExcepcion(e);
  }
  refresh();
  return exito("Temporada guardada.");
}

/** Abre o cierra la inscripción. Solo puede haber una temporada abierta: al abrir una se cierran las demás. */
export async function cambiarInscripcion(id: number, abrir: boolean): Promise<ResultadoAccion> {
  await exigirAdmin();
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
  refresh();
  return exito(abrir ? "Inscripción abierta." : "Inscripción cerrada.");
}

export async function guardarSemana(
  temporadaId: number,
  semanaId: number | null,
  _previo: Previo,
  datos: FormData,
): Promise<ResultadoAccion> {
  await exigirAdmin();
  const r = semanaSchema.safeParse(Object.fromEntries(datos));
  if (!r.success) return fallo(...mensajesDeError(r.error));
  try {
    if (semanaId) {
      await prisma.semana.update({ where: { id: semanaId, temporadaId }, data: r.data });
    } else {
      await prisma.semana.create({ data: { ...r.data, temporadaId } });
    }
  } catch (e) {
    return falloPorExcepcion(e, { unico: `Ya hay otra opción con el orden ${r.data.numero}. Usá otro número.` });
  }
  refresh();
  return exito(semanaId ? "Opción guardada." : "Opción agregada.");
}

/** Precios generales, descuento por hermanos y días sueltos. */
export async function guardarPrecios(temporadaId: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  await exigirAdmin();
  const r = preciosTemporadaSchema.safeParse(Object.fromEntries(datos));
  if (!r.success) return fallo(...mensajesDeError(r.error));
  try {
    await prisma.temporada.update({ where: { id: temporadaId }, data: r.data });
  } catch (e) {
    return falloPorExcepcion(e);
  }
  refresh();
  return exito("Precios guardados.");
}

export async function eliminarSemana(semanaId: number): Promise<ResultadoAccion> {
  await exigirAdmin();
  try {
    await prisma.semana.delete({ where: { id: semanaId } });
  } catch (e) {
    return falloPorExcepcion(e, { enUso: "No se puede borrar: hay niños inscriptos en esa opción. Desactivala en su lugar." });
  }
  refresh();
  return exito("Opción eliminada.");
}

/**
 * Guarda la lista completa de grupos de la temporada (crea, modifica y borra).
 * NO reasigna a los niños ya inscriptos; los de un grupo borrado quedan "sin grupo".
 */
export async function guardarGrupos(temporadaId: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  await exigirAdmin();
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
  await exigirAdmin();
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
