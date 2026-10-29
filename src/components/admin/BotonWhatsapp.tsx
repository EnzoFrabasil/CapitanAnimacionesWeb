"use client";

import { useEffect, useRef, useState } from "react";
import { IconoWhatsapp } from "@/components/marca/iconos";
import type { ResumenFamilia } from "@/lib/admin/consultas";
import {
  NOMBRE_PLANTILLA,
  PLANTILLAS,
  armarMensaje,
  enlaceWhatsapp,
  variablesDeMensaje,
  type ChicoMensaje,
  type ContextoMensajes,
} from "@/lib/dominio/mensajes";
import { totalFamilia } from "@/lib/dominio/opciones";

/**
 * Ícono de WhatsApp con un menú: abrir el chat vacío o con uno de los mensajes
 * ya escrito (saludo, monto a pagar, lugar confirmado) armado con los datos de
 * la familia. WhatsApp se abre en otra pestaña y el mensaje se envía a mano.
 */
export function BotonWhatsapp({
  telefono,
  contacto,
  familia,
  chicoDeRespaldo,
  contexto,
  tamano = "normal",
}: {
  /** "+5491123456789" */
  telefono: string;
  /** Nombre de pila del contacto. */
  contacto: string;
  /** Chicos activos de la familia en la temporada (con el total y el descuento). */
  familia: ResumenFamilia | undefined;
  /** Si la familia no tiene chicos activos (por ejemplo, todos cancelados), el de la fila. */
  chicoDeRespaldo: ChicoMensaje;
  contexto: ContextoMensajes | null;
  tamano?: "normal" | "chico";
}) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => !raiz.current?.contains(e.target as Node) && setAbierto(false);
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const chicos: ChicoMensaje[] =
    familia && familia.chicos.length > 0
      ? familia.chicos.map((c) => ({
          nombre: c.nombre,
          asistencia: c.asistencia,
          fechas: c.fechas,
          precio: c.precio,
          grupo: c.grupo ? { nombre: c.grupo, enlaceWhatsapp: c.enlaceGrupo } : null,
        }))
      : [chicoDeRespaldo];
  const variables = contexto
    ? variablesDeMensaje({
        contacto,
        marca: contexto.marca,
        temporada: contexto.temporada,
        chicos,
        total: familia && familia.chicos.length > 0 ? familia.total : totalFamilia([chicoDeRespaldo.precio], 0),
        porcentajeDescuento: contexto.porcentajeDescuento,
        datosPago: contexto.datosPago,
      })
    : null;

  const totalCero = chicos.every((c) => c.precio === 0);
  const claseIcono = tamano === "chico" ? "p-1" : "p-1.5";
  const claseSvg = tamano === "chico" ? "size-4" : "size-5";

  return (
    <div ref={raiz} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-haspopup="true"
        aria-label={`Escribirle por WhatsApp a ${contacto}`}
        title="WhatsApp"
        className={`rounded-lg border border-verde/50 ${claseIcono} text-marino transition hover:bg-verde/10`}
      >
        <IconoWhatsapp className={claseSvg} />
      </button>
      {abierto && (
        <div className="absolute top-full right-0 z-30 mt-1 w-64 rounded-xl border border-marino/10 bg-white p-1.5 text-left shadow-lg">
          <p className="px-2.5 pt-1 pb-1.5 text-xs font-semibold text-texto/70">Escribirle a {contacto}</p>
          <a
            href={enlaceWhatsapp(telefono)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAbierto(false)}
            className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-marino hover:bg-crema"
          >
            Abrir el chat
            <span className="block text-xs font-normal text-texto/70">Sin mensaje escrito</span>
          </a>
          {variables &&
            contexto &&
            PLANTILLAS.map((p) => (
              <a
                key={p}
                href={enlaceWhatsapp(telefono, armarMensaje(contexto.plantillas[p], variables))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setAbierto(false)}
                className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-marino hover:bg-crema"
              >
                {NOMBRE_PLANTILLA[p].nombre}
                <span className="block text-xs font-normal text-texto/70">{NOMBRE_PLANTILLA[p].descripcion}</span>
                {p === "monto" && totalCero && (
                  <span className="mt-0.5 block text-xs font-medium text-rojo">Ojo: el total da $ 0 (revisá los precios)</span>
                )}
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
