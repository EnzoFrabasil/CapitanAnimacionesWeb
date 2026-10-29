"use client";

import Image from "next/image";
import { sitio } from "@/config/sitio";
import type { TextosInscripcion } from "@/lib/contenido/esquema";
import { describirAsistencia, formatearPrecio, precioChico, totalFamilia } from "@/lib/dominio/opciones";
import { formatearDiaCorto, formatearFecha, formatearWhatsapp } from "@/lib/formato";
import { edadParaMostrar, type ContextoInscripcion, type InscripcionValidada } from "@/lib/validacion/inscripcion";
import { ACENTOS } from "./tipos";

interface Props {
  textos: TextosInscripcion;
  datos: InscripcionValidada;
  contexto: ContextoInscripcion;
  irAPaso: (paso: number) => void;
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="shrink-0 font-medium text-marino sm:w-44">{etiqueta}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

function Editar({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-semibold text-marino underline underline-offset-4">
      Editar
    </button>
  );
}

export function PasoRevision({ textos, datos, contexto, irAPaso }: Props) {
  const intro = textos.introRevision;
  const asistencias = datos.ninos.map((n) => ({ modalidad: n.modalidad, opciones: n.semanas, dias: n.dias }));
  const preciosChicos = contexto.precios ? asistencias.map((a) => precioChico(contexto.opciones, contexto.precios!, a)) : [];
  // En preinscripción los precios están en $0: no se muestran precios ni totales.
  const precios = preciosChicos.some((p) => (p ?? 0) > 0) ? contexto.precios : undefined;
  const total = precios ? totalFamilia(preciosChicos, precios.descuentoHermanos) : null;

  return (
    <div className="space-y-6">
      {intro && <p className="whitespace-pre-line">{intro}</p>}

      <section className="rounded-3xl bg-white p-5 shadow-md sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-titulo text-xl font-semibold text-marino">Contactos</h3>
          <Editar onClick={() => irAPaso(0)} />
        </div>
        <ul className="space-y-4">
          {datos.contactos.map((c, i) => (
            <li key={c.whatsapp} className={i > 0 ? "border-t border-marino/10 pt-4" : ""}>
              <p className="font-semibold">
                {c.nombre} {c.apellido} {c.parentesco && <span className="font-normal">({c.parentesco})</span>}
                {i === 0 && <span className="ml-2 rounded-full bg-amarillo px-2 py-0.5 text-xs text-marino">Principal</span>}
              </p>
              <dl className="mt-1 space-y-1 text-sm">
                <Dato etiqueta="Teléfono / WhatsApp">{formatearWhatsapp(c.whatsapp)}</Dato>
                {c.whatsappAlt && <Dato etiqueta="Otro teléfono">{formatearWhatsapp(c.whatsappAlt)}</Dato>}
                {c.email && <Dato etiqueta="Email">{c.email}</Dato>}
              </dl>
            </li>
          ))}
        </ul>
      </section>

      {datos.ninos.map((n, i) => {
        const edad = edadParaMostrar(n.fechaNacimiento, contexto.hoy);
        const precio = preciosChicos[i];
        return (
          <section
            key={i}
            className={`rounded-3xl border-t-8 bg-white p-5 shadow-md sm:p-6 ${ACENTOS[i % ACENTOS.length].borde}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-titulo text-xl font-semibold text-marino">
                {n.nombre} {n.apellido}
              </h3>
              <Editar onClick={() => irAPaso(1)} />
            </div>
            <dl className="space-y-1 text-sm">
              <Dato etiqueta="Documento">{n.dni}</Dato>
              <Dato etiqueta="Fecha de nacimiento">
                {formatearFecha(n.fechaNacimiento)} ({edad} años)
              </Dato>
              <Dato etiqueta="Asistencia">{describirAsistencia(contexto.opciones, contexto.paquetes ?? [], asistencias[i])}</Dato>
              {n.modalidad === "POR_DIA" && (
                <Dato etiqueta="Días">{n.dias.map((d) => formatearDiaCorto(d.fecha)).join(", ")}</Dato>
              )}
              {precios && <Dato etiqueta="Precio">{precio === null ? "A confirmar" : formatearPrecio(precio ?? 0)}</Dato>}
              {n.infoAdicional && <Dato etiqueta="Información adicional">{n.infoAdicional}</Dato>}
            </dl>
          </section>
        );
      })}

      {total && precios && total.total > 0 && (
        <section
          aria-labelledby="total-titulo"
          className="rounded-3xl border-2 border-marino bg-white p-5 shadow-[0_4px_0_0_#093651] sm:p-6"
        >
          <h3 id="total-titulo" className="font-titulo text-xl font-semibold text-marino">
            {textos.totalTitulo}
          </h3>

          {total.descuento > 0 && (
            <div className="aviso-descuento mt-3 flex items-center gap-3 rounded-2xl bg-verde/10 p-3" role="status">
              <Image
                src={sitio.logos.circular}
                alt=""
                width={615}
                height={615}
                sizes="48px"
                className="aviso-descuento-insignia size-12 shrink-0 rounded-full bg-white ring-2 ring-verde"
              />
              <p className="text-sm text-marino">
                <strong className="font-titulo text-base">{textos.descuentoTitulo}</strong>
                {textos.descuentoTexto && (
                  <>
                    <br />
                    {textos.descuentoTexto.replaceAll("{porcentaje}", String(precios.descuentoHermanos))}
                  </>
                )}
              </p>
            </div>
          )}

          <dl className="mt-4 space-y-1">
            {total.descuento > 0 && (
              <>
                <div className="flex justify-between gap-3 text-sm">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{formatearPrecio(total.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-3 text-sm font-medium text-verde">
                  <dt>Descuento por hermanos ({precios.descuentoHermanos}%)</dt>
                  <dd className="tabular-nums">−{formatearPrecio(total.descuento)}</dd>
                </div>
              </>
            )}
            <div className="flex items-baseline justify-between gap-3 border-t border-marino/10 pt-2">
              <dt className="font-titulo text-lg font-semibold text-marino">Total</dt>
              <dd className="font-titulo text-2xl font-bold text-naranja tabular-nums">{formatearPrecio(total.total)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-texto/80">
            {[
              total.incompleto && textos.notaDiasSueltos,
              textos.totalNota,
              datos.ninos.length === 1 && precios.descuentoHermanos > 0 && textos.notaHermano,
            ]
              .filter(Boolean)
              .join(" ")}
          </p>
        </section>
      )}
    </div>
  );
}
