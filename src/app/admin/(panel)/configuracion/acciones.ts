"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { exito, fallo, falloPorExcepcion, type ResultadoAccion } from "@/lib/admin/resultado";
import { exigirAdmin } from "@/lib/auth/admin";
import { asignarGrupo } from "@/lib/dominio/edad";
import { prisma } from "@/lib/prisma";
import { mensajesDeError, semanaSchema, temporadaSchema } from "@/lib/validacion/admin";
import { gruposTemporadaSchema } from "@/lib/validacion/grupos";
import { LARGO_MAXIMO_PERIODO } from "@/lib/dominio/periodo";
import { TURNOS } from "@/lib/validacion/inscripcion";

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
    return falloPorExcepcion(e, { unico: `Ya existe el período ${r.data.numero} en esta temporada.` });
  }
  refresh();
  return exito(semanaId ? "Semana guardada." : "Semana agregada.");
}

/** Turnos y formas de asistir que se ofrecen en el formulario de inscripción. */
export async function guardarOpciones(temporadaId: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  await exigirAdmin();
  const turnos = TURNOS.filter((t) => datos.getAll("turnos").includes(t));
  const permiteSemanas = datos.get("permiteSemanas") === "on";
  const permitePorDia = datos.get("permitePorDia") === "on";
  const nombrePeriodo = String(datos.get("nombrePeriodo") ?? "").trim();
  const horario = (campo: string) => String(datos.get(campo) ?? "").trim().slice(0, 60);
  const horarioManana = horario("horarioManana");
  const horarioTarde = horario("horarioTarde");
  const errores = [
    ...(!nombrePeriodo || nombrePeriodo.length > LARGO_MAXIMO_PERIODO
      ? [`Escribí cómo se llama cada período (hasta ${LARGO_MAXIMO_PERIODO} letras), por ejemplo Semana o Quincena.`]
      : []),
    ...(turnos.length === 0 ? ["Tiene que haber al menos un turno activo."] : []),
    ...(!permiteSemanas && !permitePorDia ? ["Tiene que haber al menos una forma de asistir."] : []),
  ];
  if (errores.length) return fallo(...errores);
  try {
    await prisma.temporada.update({
      where: { id: temporadaId },
      data: { turnos, permiteSemanas, permitePorDia, nombrePeriodo, horarioManana, horarioTarde },
    });
  } catch (e) {
    return falloPorExcepcion(e);
  }
  refresh();
  return exito("Opciones guardadas.");
}

export async function eliminarSemana(semanaId: number): Promise<ResultadoAccion> {
  await exigirAdmin();
  try {
    await prisma.semana.delete({ where: { id: semanaId } });
  } catch (e) {
    return falloPorExcepcion(e, { enUso: "No se puede borrar: hay niños inscriptos en ese período." });
  }
  refresh();
  return exito("Período eliminado.");
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
