import { diasHabilesDeSemanas } from "@/lib/dominio/dias";

// Opciones de inscripción (en la base, la tabla Semana): nombre libre, fechas,
// horario y precio. Una familia elige para cada chico una o varias opciones del
// mismo horario. Los paquetes (por ejemplo "Colonia completa" = Quincena 1 + 2)
// tienen un precio especial y se arman a mano: agregar una opción nueva no cambia
// ningún paquete.

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

/** Varias opciones (del mismo horario) con un precio especial. */
export interface Paquete {
  id: number;
  nombre: string;
  precio: number;
  /** Ids de las opciones que incluye. */
  opciones: readonly number[];
}

export interface Precios {
  /** Paquetes activos de la temporada. */
  paquetes: readonly Paquete[];
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

export interface Combinacion {
  /** Paquetes enteros que entran en lo elegido. */
  paquetes: Paquete[];
  /** Opciones que se cobran sueltas (las que no cubre ningún paquete). */
  sueltas: Opcion[];
  precio: number;
}

/**
 * La forma más barata de cobrar exactamente las opciones elegidas: paquetes
 * (sin repetir opciones) más opciones sueltas. A igual precio, la que usa paquetes.
 */
export function combinacion(opciones: readonly Opcion[], paquetes: readonly Paquete[], ids: readonly number[]): Combinacion {
  const elegidas = opciones.filter((o) => ids.includes(o.id)).sort((a, b) => a.numero - b.numero);
  const bit = new Map(elegidas.map((o, i) => [o.id, 1 << i]));
  // Solo sirven los paquetes cuyas opciones están todas elegidas.
  const utiles = paquetes
    .filter((p) => p.opciones.length > 0 && p.opciones.every((id) => bit.has(id)))
    .map((p) => ({ paquete: p, mascara: p.opciones.reduce((m, id) => m | bit.get(id)!, 0) }));
  const total = (1 << elegidas.length) - 1;
  // mejor[m] = forma más barata de cubrir el conjunto m (programación dinámica sobre subconjuntos).
  const mejor: { precio: number; paquetes: number; usados: Paquete[] }[] = [{ precio: 0, paquetes: 0, usados: [] }];
  for (let m = 1; m <= total; m++) {
    const i = Math.log2(m & -m); // la opción más baja que falta cubrir
    const sola = mejor[m & ~(1 << i)];
    let candidato = { precio: sola.precio + elegidas[i].precio, paquetes: sola.paquetes, usados: sola.usados };
    for (const u of utiles) {
      if ((u.mascara & (1 << i)) === 0 || (u.mascara & m) !== u.mascara) continue;
      const resto = mejor[m & ~u.mascara];
      const c = { precio: resto.precio + u.paquete.precio, paquetes: resto.paquetes + 1, usados: [...resto.usados, u.paquete] };
      if (c.precio < candidato.precio || (c.precio === candidato.precio && c.paquetes > candidato.paquetes)) candidato = c;
    }
    mejor[m] = candidato;
  }
  const usados = mejor[total].usados;
  const cubiertas = new Set(usados.flatMap((p) => p.opciones));
  return { paquetes: usados, sueltas: elegidas.filter((o) => !cubiertas.has(o.id)), precio: mejor[total].precio };
}

/** "Colonia completa + Quincena 3", "Quincena 1 y Quincena 2" (sin paquetes). */
export function nombreCombinacion(c: Pick<Combinacion, "paquetes" | "sueltas">): string {
  const sueltas = c.sueltas.map((o) => o.nombre);
  const lista = sueltas.length > 1 ? `${sueltas.slice(0, -1).join(", ")} y ${sueltas.at(-1)}` : (sueltas[0] ?? "");
  return [...c.paquetes.map((p) => p.nombre), ...(lista ? [lista] : [])].join(" + ");
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
  /** Precio que quedó congelado al confirmar la inscripción (no cambia con los precios nuevos). */
  precioConfirmado?: number | null;
}

/**
 * "Colonia completa · 8:30 a 12:30 hs", "Colonia completa + Quincena 3 · …",
 * "Quincena 1 y Quincena 3 · …" o "3 días · …".
 */
export function describirAsistencia(opciones: readonly Opcion[], paquetes: readonly Paquete[], a: Asistencia): string {
  if (a.modalidad === "POR_DIA") {
    const opcion = opciones.find((o) => o.id === a.dias[0]?.opcion);
    const cantidad = `${a.dias.length} ${a.dias.length === 1 ? "día" : "días"}`;
    return opcion ? `${cantidad} · ${textoHorario(opcion)}` : cantidad;
  }
  const c = combinacion(opciones, paquetes, a.opciones);
  const primera = c.paquetes.length ? opciones.find((o) => o.id === c.paquetes[0].opciones[0]) : c.sueltas[0];
  if (!primera) return "Sin opciones";
  return `${nombreCombinacion(c)} · ${textoHorario(primera)}`;
}

/**
 * Precio de un chico, o null si algo no tiene precio definido (días sueltos sin precio).
 * Un precio acordado a mano o el congelado al confirmar reemplazan al calculado.
 */
export function precioChico(opciones: readonly Opcion[], precios: Precios, a: Asistencia): number | null {
  if (a.precioAcordado !== undefined && a.precioAcordado !== null) return a.precioAcordado;
  if (a.precioConfirmado !== undefined && a.precioConfirmado !== null) return a.precioConfirmado;
  return precioCalculado(opciones, precios, a);
}

/** Precio según las opciones, paquetes y precios actuales (sin acordado ni congelado). */
export function precioCalculado(opciones: readonly Opcion[], precios: Precios, a: Asistencia): number | null {
  if (a.modalidad === "POR_DIA") return precios.dia === null ? null : precios.dia * a.dias.length;
  return combinacion(opciones, precios.paquetes, a.opciones).precio;
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
