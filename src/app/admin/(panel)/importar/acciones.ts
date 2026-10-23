"use server";

import { refresh } from "next/cache";
import { aplicarPlan, planificarDesdeTexto } from "@/lib/admin/importacion";
import { falloPorExcepcion } from "@/lib/admin/resultado";
import { exigirAdmin } from "@/lib/auth/admin";
import type { PlanImportacion } from "@/lib/csv/inscriptos";

/** Tamaño máximo del archivo (las Server Actions aceptan hasta 1 MB por pedido). */
const TAMANO_MAXIMO = 900_000;

export type RespuestaVistaPrevia = { ok: true; plan: PlanImportacion } | { ok: false; error: string };
export type RespuestaAplicar = { ok: true; aplicadas: number; conError: number } | { ok: false; error: string };

export async function previsualizarImportacion(texto: string): Promise<RespuestaVistaPrevia> {
  await exigirAdmin();
  if (typeof texto !== "string" || texto.length > TAMANO_MAXIMO) return { ok: false, error: "El archivo es demasiado grande." };
  try {
    return { ok: true, plan: await planificarDesdeTexto(texto) };
  } catch (e) {
    const r = falloPorExcepcion(e);
    return { ok: false, error: r.ok ? "" : r.errores[0] };
  }
}

/**
 * Vuelve a armar el plan con los datos actuales (no se confía en lo que manda el navegador)
 * y aplica solo las filas sin errores, todas juntas en una transacción.
 */
export async function aplicarImportacion(texto: string): Promise<RespuestaAplicar> {
  await exigirAdmin();
  if (typeof texto !== "string" || texto.length > TAMANO_MAXIMO) return { ok: false, error: "El archivo es demasiado grande." };
  try {
    const plan = await planificarDesdeTexto(texto);
    if (plan.errorGeneral) return { ok: false, error: plan.errorGeneral };
    await aplicarPlan(plan);
    refresh();
    return { ok: true, aplicadas: plan.cambios.length, conError: plan.errores.length };
  } catch (e) {
    const r = falloPorExcepcion(e, { unico: "Algún WhatsApp ya pertenece a otro contacto." });
    return { ok: false, error: r.ok ? "" : `${r.errores[0]} No se aplicó ningún cambio.` };
  }
}
