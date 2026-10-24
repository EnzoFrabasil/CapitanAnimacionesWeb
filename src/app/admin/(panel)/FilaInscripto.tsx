"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { InsigniaDuplicado, InsigniaEstado, InsigniaSinGrupo } from "@/components/admin/Insignias";
import { IconoWhatsapp } from "@/components/marca/iconos";
import type { FilaInscripto as Fila } from "@/lib/admin/consultas";
import type { ResultadoAccion } from "@/lib/admin/resultado";
import { fechaAIso } from "@/lib/dominio/fechas";
import { ETIQUETA_ESTADO, ETIQUETA_TURNO, formatearDiaCorto, formatearFechaHora, formatearWhatsapp } from "@/lib/formato";
import { ESTADOS } from "@/lib/validacion/admin";
import { TURNOS } from "@/lib/validacion/inscripcion";
import { eliminarInscripto, guardarEdicionRapida } from "./acciones";

const claseCampo = "w-full min-w-0 rounded-lg border-2 border-marino/20 bg-white px-2 py-1 text-sm focus:border-azul focus:outline-none";
const claseBotonChico = "rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50";

function IconoLapiz({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/**
 * Fila del listado de inscriptos. Con el lápiz se editan en el lugar los datos
 * principales; desde ahí también se puede eliminar. La asistencia y el resto
 * de los datos se editan en el detalle.
 */
export function FilaInscripto({
  fila: f,
  totalSemanas,
  grupos,
}: {
  fila: Fila;
  totalSemanas: number;
  grupos: { id: number; nombre: string }[];
}) {
  const contacto = f.nino.responsables[0];
  const inicial = () => ({
    nombre: f.nino.nombre,
    apellido: f.nino.apellido,
    dni: f.nino.dni,
    grupoEdadId: f.grupoEdadId ? String(f.grupoEdadId) : "",
    turno: f.turno,
    estado: f.estado,
    contactoNombre: contacto?.responsable.nombre ?? "",
    contactoApellido: contacto?.responsable.apellido ?? "",
    contactoWhatsapp: contacto ? formatearWhatsapp(contacto.responsable.whatsapp) : "",
  });
  const [editando, setEditando] = useState(false);
  const [valores, setValores] = useState(inicial);
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [pendiente, iniciar] = useTransition();

  const cambiar = (campo: keyof ReturnType<typeof inicial>, valor: string) => setValores((v) => ({ ...v, [campo]: valor }));

  const empezar = () => {
    setValores(inicial());
    setResultado(null);
    setEditando(true);
  };

  const guardar = () =>
    iniciar(async () => {
      const r = await guardarEdicionRapida(f.id, {
        nino: { nombre: valores.nombre, apellido: valores.apellido, dni: valores.dni },
        grupoEdadId: valores.grupoEdadId,
        turno: valores.turno,
        estado: valores.estado,
        contacto: contacto
          ? { nombre: valores.contactoNombre, apellido: valores.contactoApellido, whatsapp: valores.contactoWhatsapp }
          : null,
      });
      setResultado(r);
      if (r.ok) setEditando(false);
    });

  const eliminar = () => {
    if (
      !window.confirm(
        `¿Eliminar a ${f.nino.nombre} ${f.nino.apellido} de esta temporada? Se borran sus datos y no se puede deshacer.`,
      )
    ) {
      return;
    }
    iniciar(async () => setResultado(await eliminarInscripto(f.id)));
  };

  const asistencia =
    f.modalidad === "SEMANAS"
      ? f.semanas.length === totalSemanas
        ? "Colonia completa"
        : f.semanas
            .map((s) => `S${s.semana.numero}`)
            .sort()
            .join(", ")
      : `${f.dias.length} ${f.dias.length === 1 ? "día" : "días"}`;
  const detalleDias = f.modalidad === "POR_DIA" ? f.dias.map((d) => formatearDiaCorto(fechaAIso(d.fecha))).join(", ") : undefined;
  const nombreCompleto = `${f.nino.nombre} ${f.nino.apellido}`;

  return (
    <>
      <tr className={`align-top ${editando ? "bg-amarillo/10" : "hover:bg-crema/50"}`}>
        <td className="px-3 py-3 whitespace-nowrap">
          {formatearFechaHora(f.inscripcion.fechaAlta)}
          <div className="text-xs text-texto/80">Insc. N.º {f.inscripcion.numero}</div>
        </td>
        <td className="px-3 py-3">
          {editando ? (
            <div className="space-y-1">
              <input aria-label="Nombre" value={valores.nombre} onChange={(e) => cambiar("nombre", e.target.value)} className={claseCampo} />
              <input aria-label="Apellido" value={valores.apellido} onChange={(e) => cambiar("apellido", e.target.value)} className={claseCampo} />
            </div>
          ) : (
            <>
              <Link href={`/admin/inscriptos/${f.id}`} className="font-semibold text-marino underline-offset-2 hover:underline">
                {f.nino.apellido}, {f.nino.nombre}
              </Link>
              {f.posibleDuplicado && (
                <div className="mt-1">
                  <InsigniaDuplicado />
                </div>
              )}
            </>
          )}
        </td>
        <td className="px-3 py-3 whitespace-nowrap tabular-nums">
          {editando ? (
            <input aria-label="Documento" value={valores.dni} onChange={(e) => cambiar("dni", e.target.value)} className={`${claseCampo} w-28`} />
          ) : (
            f.nino.dni
          )}
        </td>
        <td className="px-3 py-3 tabular-nums">{f.edadAlInscribir}</td>
        <td className="px-3 py-3">
          {editando ? (
            <select aria-label="Grupo" value={valores.grupoEdadId} onChange={(e) => cambiar("grupoEdadId", e.target.value)} className={claseCampo}>
              <option value="">Sin grupo</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          ) : (
            (f.grupoEdad?.nombre ?? <InsigniaSinGrupo />)
          )}
        </td>
        <td className="px-3 py-3">
          {editando ? (
            <select aria-label="Turno" value={valores.turno} onChange={(e) => cambiar("turno", e.target.value)} className={claseCampo}>
              {TURNOS.map((t) => (
                <option key={t} value={t}>
                  {ETIQUETA_TURNO[t]}
                </option>
              ))}
            </select>
          ) : (
            ETIQUETA_TURNO[f.turno]
          )}
        </td>
        <td className="px-3 py-3" title={detalleDias}>
          {asistencia}
        </td>
        <td className="px-3 py-3">
          {editando ? (
            <select aria-label="Estado" value={valores.estado} onChange={(e) => cambiar("estado", e.target.value)} className={claseCampo}>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO[e]}
                </option>
              ))}
            </select>
          ) : (
            <InsigniaEstado estado={f.estado} />
          )}
        </td>
        <td className="px-3 py-3">
          {!contacto ? (
            <span className="text-rojo">Sin contacto</span>
          ) : editando ? (
            <div className="space-y-1">
              <input aria-label="Nombre del contacto" value={valores.contactoNombre} onChange={(e) => cambiar("contactoNombre", e.target.value)} className={claseCampo} />
              <input aria-label="Apellido del contacto" value={valores.contactoApellido} onChange={(e) => cambiar("contactoApellido", e.target.value)} className={claseCampo} />
              <input aria-label="WhatsApp del contacto" type="tel" value={valores.contactoWhatsapp} onChange={(e) => cambiar("contactoWhatsapp", e.target.value)} className={claseCampo} />
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div>
                {contacto.responsable.nombre} {contacto.responsable.apellido}
                <div className="text-xs text-texto/80">
                  {contacto.parentesco && `${contacto.parentesco} · `}
                  {formatearWhatsapp(contacto.responsable.whatsapp)}
                </div>
              </div>
              <a
                href={`https://wa.me/${contacto.responsable.whatsapp.replace("+", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir WhatsApp con ${contacto.responsable.nombre} ${contacto.responsable.apellido}`}
                title="Abrir WhatsApp"
                className="shrink-0 rounded-lg border border-verde/50 p-1.5 text-marino transition hover:bg-verde/10"
              >
                <IconoWhatsapp className="size-5" />
              </a>
            </div>
          )}
        </td>
        <td className="px-3 py-3">
          {editando ? (
            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={guardar} disabled={pendiente} className={`${claseBotonChico} bg-marino text-white hover:bg-marino/90`}>
                {pendiente ? "Guardando…" : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(false);
                  setResultado(null);
                }}
                disabled={pendiente}
                className={`${claseBotonChico} border-2 border-marino/20 text-marino hover:border-marino`}
              >
                Cancelar
              </button>
              <button type="button" onClick={eliminar} disabled={pendiente} className={`${claseBotonChico} text-rojo underline-offset-2 hover:underline`}>
                Eliminar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={empezar}
              aria-label={`Editar a ${nombreCompleto}`}
              title="Editar"
              className="rounded-lg border border-marino/20 p-1.5 text-marino transition hover:border-marino hover:bg-marino/5"
            >
              <IconoLapiz className="size-5" />
            </button>
          )}
        </td>
      </tr>
      {resultado && (
        <tr>
          <td colSpan={10} className={`px-3 pb-3 text-sm font-medium ${resultado.ok ? "text-marino" : "text-rojo"}`} role={resultado.ok ? "status" : "alert"}>
            {resultado.ok ? `${nombreCompleto}: ${resultado.mensaje}` : resultado.errores.join(" ")}
          </td>
        </tr>
      )}
    </>
  );
}
