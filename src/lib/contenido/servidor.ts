import "server-only";
import { cacheTag } from "next/cache";
import { contenidoInicial } from "@/config/contenidoInicial";
import { prisma } from "@/lib/prisma";
import { contenidoSchema, type Contenido } from "./esquema";

/** Tag de caché del contenido publicado: publicar llama a updateTag(TAG_CONTENIDO). */
export const TAG_CONTENIDO = "contenido-sitio";

/** Versiones que se conservan para poder volver atrás. */
export const VERSIONES_GUARDADAS = 20;

/** Una imagen subida y todavía sin publicar se conserva este tiempo (por si el editor sigue abierto). */
const GRACIA_IMAGENES_MS = 24 * 60 * 60 * 1000;

function leer(datos: unknown): Contenido {
  const r = contenidoSchema.safeParse(datos);
  if (r.success) return r.data;
  // No debería pasar (se valida al publicar), pero si el esquema cambia, mejor mostrar algo.
  console.error("Contenido publicado inválido, se usa el contenido inicial.");
  return contenidoInicial;
}

/** Contenido publicado (cacheado hasta que se publique una versión nueva). */
export async function obtenerContenido(): Promise<Contenido> {
  "use cache";
  cacheTag(TAG_CONTENIDO);
  const ultima = await prisma.contenidoSitio.findFirst({ orderBy: { id: "desc" }, select: { datos: true } });
  return ultima ? leer(ultima.datos) : contenidoInicial;
}

export interface Version {
  id: number;
  creadoEn: Date;
  contenido: Contenido;
}

/** Últimas versiones publicadas, de la más nueva a la más vieja (sin caché: para el editor). */
export async function listarVersiones(): Promise<Version[]> {
  const filas = await prisma.contenidoSitio.findMany({ orderBy: { id: "desc" }, take: VERSIONES_GUARDADAS });
  return filas.map((f) => ({ id: f.id, creadoEn: f.creadoEn, contenido: leer(f.datos) }));
}

/** Ids de imágenes subidas (/imagenes/<id>) que usa un contenido. */
export function imagenesUsadas(datos: unknown): string[] {
  return [...JSON.stringify(datos).matchAll(/\/imagenes\/([a-z0-9]+)/g)].map((m) => m[1]);
}

/**
 * Guarda una versión nueva (ya validada) y devuelve su id. Después borra las
 * versiones viejas y las imágenes que ya no usa ninguna versión guardada.
 */
export async function guardarVersion(contenido: Contenido): Promise<number> {
  const { id } = await prisma.contenidoSitio.create({ data: { datos: contenido }, select: { id: true } });

  try {
    const viejas = await prisma.contenidoSitio.findMany({
      orderBy: { id: "desc" },
      skip: VERSIONES_GUARDADAS,
      select: { id: true },
    });
    if (viejas.length) await prisma.contenidoSitio.deleteMany({ where: { id: { in: viejas.map((v) => v.id) } } });

    const guardadas = await prisma.contenidoSitio.findMany({ select: { datos: true } });
    const usadas = new Set(guardadas.flatMap((v) => imagenesUsadas(v.datos)));
    await prisma.imagen.deleteMany({
      where: { id: { notIn: [...usadas] }, creadaEn: { lt: new Date(Date.now() - GRACIA_IMAGENES_MS) } },
    });
  } catch (e) {
    // La versión ya está publicada: la limpieza se reintenta en la próxima publicación.
    console.error("No se pudo limpiar versiones o imágenes viejas:", e instanceof Error ? e.name : "desconocido");
  }
  return id;
}
