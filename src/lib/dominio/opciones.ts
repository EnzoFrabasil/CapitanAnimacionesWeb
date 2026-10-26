import { diasHabilesDeSemanas } from "@/lib/dominio/dias";

// Opciones de inscripción (en la base, la tabla Semana): nombre libre, fechas,
// horario y precio. Una familia elige para cada chico una o varias opciones del
// mismo horario; si elige todas las de su horario es "colonia completa".

export interface Opcion {
  id: number;
  numero: number;
  nombre: string;
  /** aaaa-mm-dd */
  fechaInicio: string;
  fechaFin: string;
  /** HH:MM */
  horaInicio: string;
  horaFin: string;
  /** En pesos. */
  precio: number;
}

export interface Precios {
  /** Se cobra si un chico tiene todas las opciones de su horario (null = suma de opciones). */
  coloniaCompleta: number | null;
  /** Por día suelto (null = a confirmar). */
  dia: number | null;
  /** Porcentaje de descuento por hermanos. */
  descuentoHermanos: number;
}

export type ModoDescuento = "AUTOMATICO" | "SI" | "NO";

export const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "08:30" → "8:30" */
const hora = (hhmm: string) => hhmm.replace(/^0(\d)/, "$1");

/** "8:30 a 12:30 hs" */
export const textoHorario = (o: Pick<Opcion, "horaInicio" | "horaFin">) => `${hora(o.horaInicio)} a ${hora(o.horaFin)} hs`;

/** Clave para agrupar opciones del mismo horario. */
export const claveHorario = (o: Pick<Opcion, "horaInicio" | "horaFin">) => `${o.horaInicio}-${o.horaFin}`;

/** "$ 230.000" */
export const formatearPrecio = (pesos: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(pesos);

/** Opciones de un mismo horario, en orden. */
export function opcionesDelHorario(opciones: readonly Opcion[], clave: string): Opcion[] {
  return opciones.filter((o) => claveHorario(o) === clave).sort((a, b) => a.numero - b.numero);
}

/** Horarios distintos, en el orden en que aparecen. */
export function horarios(opciones: readonly Opcion[]): { clave: string; texto: string; opciones: Opcion[] }[] {
  const claves = [...new Set([...opciones].sort((a, b) => a.numero - b.numero).map(claveHorario))];
  return claves.map((clave) => {
    const delHorario = opcionesDelHorario(opciones, clave);
    return { clave, texto: textoHorario(delHorario[0]), opciones: delHorario };
  });
}

/** Primera y última fecha de un grupo de opciones (aunque no estén en orden). */
export function rangoDeFechas(opciones: readonly Opcion[]): { desde: string; hasta: string } {
  const desde = opciones.map((o) => o.fechaInicio).sort()[0];
  const hasta = opciones.map((o) => o.fechaFin).sort().at(-1)!;
  return { desde, hasta };
}

/** Horarios de las opciones elegidas (para validar que sea uno solo). */
export function horariosElegidos(opciones: readonly Opcion[], ids: readonly number[]): string[] {
  return [...new Set(opciones.filter((o) => ids.includes(o.id)).map(claveHorario))];
}

/** true si eligió todas las opciones de su horario y ese horario tiene más de una. */
export function esColoniaCompleta(opciones: readonly Opcion[], ids: readonly number[]): boolean {
  const claves = horariosElegidos(opciones, ids);
  if (claves.length !== 1) return false;
  const delHorario = opcionesDelHorario(opciones, claves[0]);
  return delHorario.length > 1 && delHorario.every((o) => ids.includes(o.id));
}

/** Opción a la que pertenece un día (por fechas) dentro de las opciones elegibles. */
export function opcionDelDia(opciones: readonly Opcion[], dia: string): Opcion[] {
  return opciones.filter((o) => o.fechaInicio <= dia && dia <= o.fechaFin);
}

/** Días hábiles de una opción. */
export const diasDeOpcion = (o: Opcion) => diasHabilesDeSemanas([o]);

export interface Asistencia {
  modalidad: "SEMANAS" | "POR_DIA";
  /** Opciones elegidas (modalidad SEMANAS). */
  opciones: readonly number[];
  /** Días sueltos, cada uno con su opción (modalidad POR_DIA). */
  dias: readonly { fecha: string; opcion: number }[];
  /** Precio acordado a mano desde el panel; si está, reemplaza al calculado. */
  precioAcordado?: number | null;
}

/**
 * "Colonia completa · 8:30 a 12:30 hs", "Quincena 1 y Quincena 3 · 8:30 a 12:30 hs"
 * o "3 días · 8:30 a 12:30 hs".
 */
export function describirAsistencia(opciones: readonly Opcion[], a: Asistencia): string {
  if (a.modalidad === "POR_DIA") {
    const opcion = opciones.find((o) => o.id === a.dias[0]?.opcion);
    const cantidad = `${a.dias.length} ${a.dias.length === 1 ? "día" : "días"}`;
    return opcion ? `${cantidad} · ${textoHorario(opcion)}` : cantidad;
  }
  const elegidas = opciones.filter((o) => a.opciones.includes(o.id)).sort((x, y) => x.numero - y.numero);
  if (elegidas.length === 0) return "Sin opciones";
  const horario = textoHorario(elegidas[0]);
  if (esColoniaCompleta(opciones, a.opciones)) return `Colonia completa · ${horario}`;
  const nombres = elegidas.map((o) => o.nombre);
  const lista = nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}` : nombres[0];
  return `${lista} · ${horario}`;
}

/** Precio de un chico, o null si algo no tiene precio definido (días sueltos sin precio). */
export function precioChico(opciones: readonly Opcion[], precios: Precios, a: Asistencia): number | null {
  if (a.precioAcordado !== undefined && a.precioAcordado !== null) return a.precioAcordado;
  if (a.modalidad === "POR_DIA") return precios.dia === null ? null : precios.dia * a.dias.length;
  if (precios.coloniaCompleta !== null && esColoniaCompleta(opciones, a.opciones)) return precios.coloniaCompleta;
  return opciones.filter((o) => a.opciones.includes(o.id)).reduce((total, o) => total + o.precio, 0);
}

export interface TotalFamilia {
  subtotal: number;
  /** Monto descontado (0 si no corresponde). */
  descuento: number;
  total: number;
  /** true si algún chico tiene precio a confirmar (no entra en el total). */
  incompleto: boolean;
}

/**
 * Total de la familia: suma de los chicos y, si corresponde, el descuento por
 * hermanos sobre el total (automático con 2 o más chicos).
 */
export function totalFamilia(
  preciosChicos: readonly (number | null)[],
  porcentaje: number,
  modo: ModoDescuento = "AUTOMATICO",
): TotalFamilia {
  const conPrecio = preciosChicos.filter((p): p is number => p !== null);
  const subtotal = conPrecio.reduce((a, b) => a + b, 0);
  const aplica = modo === "SI" || (modo === "AUTOMATICO" && preciosChicos.length >= 2);
  const descuento = aplica ? Math.round((subtotal * porcentaje) / 100) : 0;
  return { subtotal, descuento, total: subtotal - descuento, incompleto: conPrecio.length < preciosChicos.length };
}
