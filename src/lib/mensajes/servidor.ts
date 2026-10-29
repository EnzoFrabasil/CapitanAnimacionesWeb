import "server-only";
import { z } from "zod";
import { LARGO_MAXIMO_DATOS_PAGO, LARGO_MAXIMO_PLANTILLA, PLANTILLAS_INICIALES } from "@/config/mensajes";
import { PLANTILLAS, type Plantilla } from "@/lib/dominio/mensajes";
import { prisma } from "@/lib/prisma";

// Plantillas de WhatsApp y datos de pago, guardados en Ajuste ("mensajesWhatsapp").
// Solo se leen en el panel: nunca se mandan al sitio público.

const CLAVE = "mensajesWhatsapp";

export interface AjustesMensajes {
  plantillas: Record<Plantilla, string>;
  datosPago: string;
}

const plantilla = z.string().max(LARGO_MAXIMO_PLANTILLA, `Cada mensaje puede tener hasta ${LARGO_MAXIMO_PLANTILLA} caracteres.`);

export const ajustesMensajesSchema = z.object({
  plantillas: z.object(
    Object.fromEntries(PLANTILLAS.map((p) => [p, plantilla.trim().min(1, "Ningún mensaje puede quedar vacío.")])) as Record<
      Plantilla,
      z.ZodString
    >,
  ),
  datosPago: z.string().trim().max(LARGO_MAXIMO_DATOS_PAGO, `Los datos de pago pueden tener hasta ${LARGO_MAXIMO_DATOS_PAGO} caracteres.`),
});

/** Lo guardado, completando con los textos iniciales lo que falte (o si nunca se guardó). */
export async function obtenerMensajes(): Promise<AjustesMensajes> {
  const fila = await prisma.ajuste.findUnique({ where: { clave: CLAVE } });
  const guardado = z
    .object({ plantillas: z.record(z.string(), z.string()).optional(), datosPago: z.string().optional() })
    .catch({})
    .parse(fila?.valor ?? {});
  return {
    plantillas: Object.fromEntries(
      PLANTILLAS.map((p) => [p, guardado.plantillas?.[p] || PLANTILLAS_INICIALES[p]]),
    ) as Record<Plantilla, string>,
    datosPago: guardado.datosPago ?? "",
  };
}

export async function guardarMensajes(ajustes: AjustesMensajes): Promise<void> {
  const valor = { plantillas: ajustes.plantillas, datosPago: ajustes.datosPago };
  await prisma.ajuste.upsert({ where: { clave: CLAVE }, create: { clave: CLAVE, valor }, update: { valor } });
}
