import {
  combinacion,
  formatearPrecio,
  nombreCombinacion,
  rangoDeFechas,
  textoHorario,
  type Asistencia,
  type Opcion,
  type Paquete,
  type TotalFamilia,
} from "./opciones";

// Mensajes de WhatsApp para las familias: plantillas editables con palabras
// entre llaves ({contacto}, {total}, etc.) que se reemplazan con los datos de
// la familia. El mensaje se abre en WhatsApp ya escrito; se envía a mano.

export const PLANTILLAS = ["saludo", "monto", "confirmado"] as const;
export type Plantilla = (typeof PLANTILLAS)[number];

export const NOMBRE_PLANTILLA: Record<Plantilla, { nombre: string; descripcion: string }> = {
  saludo: { nombre: "Saludo", descripcion: "Para empezar la conversación" },
  monto: { nombre: "Monto a pagar", descripcion: "Detalle por chico, descuento, total y cómo pagar" },
  confirmado: { nombre: "Lugar confirmado", descripcion: "Fechas, horario y grupo de WhatsApp de papis" },
};

/** Palabras que se pueden usar en las plantillas (se muestran como ayuda al editarlas). */
export const VARIABLES: { clave: string; descripcion: string }[] = [
  { clave: "contacto", descripcion: "Nombre de la persona a la que le escribís" },
  { clave: "chicos", descripcion: "Nombres de los chicos de la familia (\"Juana y Pedro\")" },
  { clave: "temporada", descripcion: "Nombre de la temporada" },
  { clave: "marca", descripcion: "Capitán Animaciones" },
  { clave: "detalle", descripcion: "Una línea por chico con lo que eligió y su precio" },
  { clave: "fechas", descripcion: "Una línea por chico con sus fechas y horario" },
  { clave: "descuento", descripcion: "La línea del descuento por hermanos (vacía si no tienen)" },
  { clave: "total", descripcion: "Total a pagar de la familia" },
  { clave: "datosPago", descripcion: "Cómo pagar (alias, CBU, titular)" },
  { clave: "gruposWhatsapp", descripcion: "Invitación con el link del grupo de WhatsApp de papis de cada chico (vacía si su grupo no tiene link)" },
];

/** Lo que comparten todos los mensajes de una temporada (se arma una vez en el servidor). */
export interface ContextoMensajes {
  plantillas: Record<Plantilla, string>;
  datosPago: string;
  marca: string;
  temporada: string;
  porcentajeDescuento: number;
}

export interface ChicoMensaje {
  nombre: string;
  /** "Colonia completa · 8:30 a 12:30 hs" */
  asistencia: string;
  /** "Quincena 1 (4/1 al 15/1) · 8:30 a 12:30 hs" */
  fechas: string;
  precio: number | null;
  grupo: { nombre: string; enlaceWhatsapp: string | null } | null;
}

export interface DatosMensaje {
  contacto: string;
  marca: string;
  temporada: string;
  chicos: readonly ChicoMensaje[];
  total: TotalFamilia;
  porcentajeDescuento: number;
  datosPago: string;
}

/** "Juana", "Juana y Pedro", "Juana, Pedro y Ana". */
export function listaNombres(nombres: readonly string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/** "2027-01-04" → "4/1" */
const diaMes = (iso: string) => {
  const [, mes, dia] = iso.split("-");
  return `${Number(dia)}/${Number(mes)}`;
};

/**
 * Fechas y horario de un chico para el mensaje:
 * "Colonia completa (4/1 al 29/1) · 8:30 a 12:30 hs", "Quincena 1 (4/1 al 15/1) · …",
 * "Colonia completa + Quincena 3 (4/1 al 29/1 y 1/2 al 12/2) · …" o "3 días: 5/1, 6/1 y 8/1 · …".
 */
export function textoFechas(opciones: readonly Opcion[], paquetes: readonly Paquete[], a: Asistencia): string {
  if (a.modalidad === "POR_DIA") {
    const opcion = opciones.find((o) => o.id === a.dias[0]?.opcion);
    const dias = [...a.dias].map((d) => d.fecha).sort();
    const texto = `${dias.length} ${dias.length === 1 ? "día" : "días"}: ${listaNombres(dias.map(diaMes))}`;
    return opcion ? `${texto} · ${textoHorario(opcion)}` : texto;
  }
  const c = combinacion(opciones, paquetes, a.opciones);
  // Cada paquete y cada opción suelta con su rango de fechas.
  const tramos = [
    ...c.paquetes.map((p) => opciones.filter((o) => p.opciones.includes(o.id))),
    ...c.sueltas.map((o) => [o]),
  ].filter((t) => t.length > 0);
  if (tramos.length === 0) return "sin fechas elegidas";
  const fechas = tramos
    .map((t) => rangoDeFechas(t))
    .sort((x, y) => x.desde.localeCompare(y.desde))
    .map((r) => `${diaMes(r.desde)} al ${diaMes(r.hasta)}`)
    .join(" y ");
  return `${nombreCombinacion(c)} (${fechas}) · ${textoHorario(tramos[0][0])}`;
}

/** Valores de cada palabra para una familia. */
export function variablesDeMensaje(d: DatosMensaje): Record<string, string> {
  const grupos = new Map<string, { link: string; chicos: string[] }>();
  for (const c of d.chicos) {
    if (!c.grupo?.enlaceWhatsapp) continue;
    const g = grupos.get(c.grupo.nombre) ?? { link: c.grupo.enlaceWhatsapp, chicos: [] };
    g.chicos.push(c.nombre);
    grupos.set(c.grupo.nombre, g);
  }
  return {
    contacto: d.contacto,
    chicos: listaNombres(d.chicos.map((c) => c.nombre)),
    temporada: d.temporada,
    marca: d.marca,
    detalle: d.chicos.map((c) => `• ${c.nombre}: ${c.asistencia} — ${c.precio === null ? "a confirmar" : formatearPrecio(c.precio)}`).join("\n"),
    fechas: d.chicos.map((c) => `• ${c.nombre}: ${c.fechas}`).join("\n"),
    descuento:
      d.total.descuento > 0
        ? `Tienen un ${d.porcentajeDescuento}% de descuento por hermanos: −${formatearPrecio(d.total.descuento)}.`
        : "",
    total: `${formatearPrecio(d.total.total)}${d.total.incompleto ? " (más los días a confirmar)" : ""}`,
    datosPago: d.datosPago.trim(),
    // Con la invitación incluida, así si no hay links no queda una frase colgada.
    gruposWhatsapp: grupos.size
      ? [
          `Si querés, sumate al grupo de WhatsApp de papis${grupos.size > 1 ? " de cada uno" : ""}:`,
          ...[...grupos].map(([nombre, g]) => `• ${nombre} (${listaNombres(g.chicos)}): ${g.link}`),
        ].join("\n")
      : "",
  };
}

/**
 * Reemplaza las palabras {así} de la plantilla. Las desconocidas quedan como
 * están. Las líneas que quedan vacías por una palabra sin valor no dejan huecos.
 */
export function armarMensaje(plantilla: string, variables: Record<string, string>): string {
  return plantilla
    .replace(/\{(\w+)\}/g, (original, clave: string) => (clave in variables ? variables[clave] : original))
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Link que abre WhatsApp con el mensaje ya escrito ("+549…" → wa.me/549…). */
export const enlaceWhatsapp = (e164: string, texto?: string) =>
  `https://wa.me/${e164.replace(/\D/g, "")}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;

/** Un link de grupo de WhatsApp válido (chat.whatsapp.com/...), o null si está vacío. */
export function normalizarEnlaceGrupo(texto: string): string | null | "invalido" {
  const t = texto.trim();
  if (!t) return null;
  return /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/.test(t) ? t : "invalido";
}
