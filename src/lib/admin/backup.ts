import { prisma } from "@/lib/prisma";

// Copia completa de la base en un JSON: configuración, inscriptos, contenido
// de la página e imágenes (en base64). Las tablas van en orden de dependencia
// (primero las que no dependen de otras), por si hay que restaurar a mano.
// No incluye contraseñas, sesiones ni el registro de cambios.
// Sin "server-only" para poder usarlo también desde scripts/backup.ts.

export const VERSION_BACKUP = 1;

export async function generarBackup() {
  const [
    temporadas,
    semanas,
    gruposEdad,
    familias,
    ninos,
    responsables,
    ninoResponsables,
    inscripciones,
    inscripcionesNino,
    inscripcionSemanas,
    inscripcionDias,
    contenidoSitio,
    imagenes,
    roles,
    usuarios,
  ] = await prisma.$transaction([
    prisma.temporada.findMany({ orderBy: { id: "asc" } }),
    prisma.semana.findMany({ orderBy: { id: "asc" } }),
    prisma.grupoEdad.findMany({ orderBy: { id: "asc" } }),
    prisma.familia.findMany({ orderBy: { id: "asc" } }),
    prisma.nino.findMany({ orderBy: { id: "asc" } }),
    prisma.responsable.findMany({ orderBy: { id: "asc" } }),
    prisma.ninoResponsable.findMany(),
    prisma.inscripcion.findMany({ orderBy: { id: "asc" } }),
    prisma.inscripcionNino.findMany({ orderBy: { id: "asc" } }),
    prisma.inscripcionSemana.findMany(),
    prisma.inscripcionDia.findMany(),
    prisma.contenidoSitio.findMany({ orderBy: { id: "asc" } }),
    prisma.imagen.findMany({ orderBy: { creadaEn: "asc" } }),
    prisma.rol.findMany({ orderBy: { id: "asc" } }),
    // Sin el hash de la contraseña: al restaurar, cada usuario necesita una nueva.
    prisma.usuario.findMany({ orderBy: { id: "asc" }, omit: { passwordHash: true } }),
  ]);

  const tablas = {
    temporadas,
    semanas,
    gruposEdad,
    familias,
    ninos,
    responsables,
    ninoResponsables,
    inscripciones,
    inscripcionesNino,
    inscripcionSemanas,
    inscripcionDias,
    contenidoSitio,
    roles,
    usuarios,
    imagenes: imagenes.map(({ datos, ...resto }) => ({ ...resto, datosBase64: Buffer.from(datos).toString("base64") })),
  };

  return {
    version: VERSION_BACKUP,
    generadoEn: new Date().toISOString(),
    cantidades: Object.fromEntries(Object.entries(tablas).map(([nombre, filas]) => [nombre, filas.length])),
    tablas,
  };
}

/** "backup-capitan-2026-10-26-1530.json" (hora de Argentina). */
export function nombreArchivoBackup(fecha = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? "";
  return `backup-capitan-${p("year")}-${p("month")}-${p("day")}-${p("hour")}${p("minute")}.json`;
}
