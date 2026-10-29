import { fechaAIso, fechaDesdeIso, sumarDias } from "@/lib/dominio/fechas";
import {
  combinacion,
  horarios,
  precioChico,
  totalFamilia,
  type Asistencia,
  type ModoDescuento,
  type Opcion,
  type Precios,
} from "@/lib/dominio/opciones";

// Resumen de una temporada para el panel de analíticas (sin acceso a la base).
// Todavía no hay pagos: el dinero es lo que se cobraría según los precios,
// "confirmado" para los chicos confirmados y "pendiente" para los que están en espera o contactados.

export type EstadoInscripto = "EN_ESPERA" | "CONTACTADO" | "CONFIRMADO" | "CANCELADO";

export interface InscriptoAnalitica {
  id: number;
  estado: EstadoInscripto;
  familiaId: number;
  /** Descuento por hermanos elegido para la familia. */
  modoDescuento: ModoDescuento;
  grupoId: number | null;
  /** Día de alta en Argentina (aaaa-mm-dd). */
  alta: string;
  asistencia: Asistencia;
}

export interface PorEstado {
  confirmados: number;
  contactados: number;
  enEspera: number;
}

export interface Analiticas {
  ninos: PorEstado & { activos: number; cancelados: number };
  familias: number;
  /** null si la temporada no tiene cupo. */
  cupo: { total: number; ocupados: number; quedan: number } | null;
  dinero: {
    confirmado: number;
    pendiente: number;
    /** Descuento por hermanos ya restado de los montos anteriores. */
    descuentos: number;
    /** Chicos por días sueltos sin precio por día definido (no suman). */
    aConfirmar: number;
  };
  grupos: ({ id: number | null; nombre: string } & PorEstado)[];
  /** Una fila por horario, con colonia completa y cada opción. */
  horarios: { texto: string; total: number; filas: ({ nombre: string } & PorEstado)[] }[];
  /** Chicos inscriptos por día de alta, desde el primero hasta `hasta` (incluidos los días sin altas). */
  porDia: { fecha: string; cantidad: number }[];
}

const vacio = (): PorEstado => ({ confirmados: 0, contactados: 0, enEspera: 0 });

function sumar(destino: PorEstado, estado: EstadoInscripto) {
  if (estado === "CONFIRMADO") destino.confirmados++;
  else if (estado === "CONTACTADO") destino.contactados++;
  else if (estado === "EN_ESPERA") destino.enEspera++;
}

/** Opciones a las que va un chico (por opción o por los días que eligió). */
const opcionesDe = (a: Asistencia) => (a.modalidad === "SEMANAS" ? a.opciones : [...new Set(a.dias.map((d) => d.opcion))]);

export function calcularAnaliticas(datos: {
  inscriptos: readonly InscriptoAnalitica[];
  opciones: readonly Opcion[];
  precios: Precios;
  grupos: readonly { id: number; nombre: string }[];
  cupo: number | null;
  /** Último día del gráfico por día (hoy, aaaa-mm-dd). */
  hasta: string;
}): Analiticas {
  const { inscriptos, opciones, precios } = datos;
  const activos = inscriptos.filter((i) => i.estado !== "CANCELADO");

  // Dinero: el total de cada familia (con su descuento) se reparte entre sus chicos
  // en proporción a su precio, y cada parte suma según el estado del chico.
  const dinero = { confirmado: 0, pendiente: 0, descuentos: 0, aConfirmar: 0 };
  const porFamilia = new Map<number, InscriptoAnalitica[]>();
  for (const i of activos) porFamilia.set(i.familiaId, [...(porFamilia.get(i.familiaId) ?? []), i]);
  for (const chicos of porFamilia.values()) {
    const preciosChicos = chicos.map((c) => precioChico(opciones, precios, c.asistencia));
    const total = totalFamilia(preciosChicos, precios.descuentoHermanos, chicos[0].modoDescuento);
    const factor = total.subtotal > 0 ? total.total / total.subtotal : 1;
    dinero.descuentos += total.descuento;
    chicos.forEach((c, i) => {
      const precio = preciosChicos[i];
      if (precio === null) {
        dinero.aConfirmar++;
        return;
      }
      const parte = precio * factor;
      if (c.estado === "CONFIRMADO") dinero.confirmado += parte;
      else dinero.pendiente += parte;
    });
  }
  // Se redondea al final para que confirmado + pendiente coincida con la suma de los totales.
  dinero.confirmado = Math.round(dinero.confirmado);
  dinero.pendiente = Math.round(dinero.pendiente);

  const grupos = [
    ...datos.grupos.map((g) => ({ id: g.id as number | null, nombre: g.nombre, ...vacio() })),
    { id: null, nombre: "Sin grupo", ...vacio() },
  ];
  for (const i of activos) sumar(grupos.find((g) => g.id === i.grupoId) ?? grupos.at(-1)!, i.estado);

  // Por horario: una fila por paquete (los que lo tienen entero) y una por opción suelta.
  const filasHorario = horarios(opciones).map((h) => {
    const delHorario = (ids: readonly number[]) => ids.length > 0 && ids.every((id) => h.opciones.some((o) => o.id === id));
    const paquetes = precios.paquetes.filter((p) => delHorario(p.opciones)).map((p) => ({ id: p.id, nombre: p.nombre, ...vacio() }));
    const filas = h.opciones.map((o) => ({ id: o.id, nombre: o.nombre, ...vacio() }));
    let total = 0;
    for (const i of activos) {
      const ids = opcionesDe(i.asistencia);
      if (!ids.some((id) => h.opciones.some((o) => o.id === id))) continue;
      total++;
      if (i.asistencia.modalidad === "POR_DIA") {
        for (const fila of filas) if (ids.includes(fila.id)) sumar(fila, i.estado);
        continue;
      }
      const c = combinacion(opciones, precios.paquetes, ids);
      for (const p of c.paquetes) {
        const fila = paquetes.find((x) => x.id === p.id);
        if (fila) sumar(fila, i.estado);
      }
      for (const o of c.sueltas) {
        const fila = filas.find((x) => x.id === o.id);
        if (fila) sumar(fila, i.estado);
      }
    }
    return {
      texto: h.texto,
      total,
      filas: [...paquetes, ...filas].map(({ id: _id, ...f }) => f),
    };
  });

  // Por día cuentan todos los que se anotaron, también los que después se cancelaron.
  const conteo = new Map<string, number>();
  for (const i of inscriptos) conteo.set(i.alta, (conteo.get(i.alta) ?? 0) + 1);
  const porDia: Analiticas["porDia"] = [];
  const primero = [...conteo.keys()].sort()[0];
  if (primero) {
    for (let d = fechaDesdeIso(primero); fechaAIso(d) <= datos.hasta; d = sumarDias(d, 1)) {
      porDia.push({ fecha: fechaAIso(d), cantidad: conteo.get(fechaAIso(d)) ?? 0 });
    }
  }

  const ninos = { ...vacio(), activos: activos.length, cancelados: inscriptos.length - activos.length };
  for (const i of activos) sumar(ninos, i.estado);

  return {
    ninos,
    familias: porFamilia.size,
    cupo: datos.cupo === null ? null : { total: datos.cupo, ocupados: activos.length, quedan: Math.max(0, datos.cupo - activos.length) },
    dinero,
    grupos: grupos.filter((g) => g.id !== null || g.confirmados + g.contactados + g.enEspera > 0),
    horarios: filasHorario,
    porDia,
  };
}
