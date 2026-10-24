"use client";

import { formatearDiaCorto, formatearFecha, formatearWhatsapp } from "@/lib/formato";
import { etiquetaModalidad, etiquetaTurno, periodo } from "@/lib/dominio/periodo";
import { edadParaMostrar, type ContextoInscripcion, type InscripcionValidada } from "@/lib/validacion/inscripcion";
import { ACENTOS } from "./tipos";

interface Props {
  intro: string;
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

export function PasoRevision({ intro, datos, contexto, irAPaso }: Props) {
  const semanaPorId = new Map(contexto.semanas.map((s) => [s.id, s]));
  const p = periodo(contexto.nombrePeriodo);

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
              <Dato etiqueta="Turno">{etiquetaTurno(n.turno, contexto.horarios)}</Dato>
              <Dato etiqueta={etiquetaModalidad(n.modalidad, p)}>
                {n.modalidad === "SEMANAS"
                  ? n.semanas.length === contexto.semanas.length
                    ? "Colonia completa"
                    : n.semanas.map((id) => `${p.singular} ${semanaPorId.get(id)?.numero}`).join(", ")
                  : n.dias.map(formatearDiaCorto).join(", ")}
              </Dato>
              {n.infoAdicional && <Dato etiqueta="Información adicional">{n.infoAdicional}</Dato>}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
