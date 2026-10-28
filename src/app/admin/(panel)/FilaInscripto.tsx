"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { InsigniaDuplicado, InsigniaEstado, InsigniaSinGrupo } from "@/components/admin/Insignias";
import { IconoWhatsapp } from "@/components/marca/iconos";
import { LARGO_MAXIMO } from "@/config/inscripcion";
import type { FilaInscripto as Fila, ResumenFamilia } from "@/lib/admin/consultas";
import type { ResultadoAccion } from "@/lib/admin/resultado";
import { fechaAIso } from "@/lib/dominio/fechas";
import { describirAsistencia, formatearPrecio, type Opcion } from "@/lib/dominio/opciones";
import { ETIQUETA_ESTADO, formatearDiaCorto, formatearFechaHora, formatearWhatsapp } from "@/lib/formato";
import { ESTADOS } from "@/lib/validacion/admin";
import { eliminarInscripto, guardarEdicionRapida, guardarInfoAdicional } from "./acciones";

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

function IconoFlecha({ abierta }: { abierta: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`size-4 transition-transform ${abierta ? "rotate-90" : ""}`}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/**
 * Fila del listado de inscriptos. La flecha abre una ficha rápida de solo lectura
 * (información adicional, contactos, hermanos y total de la familia). Con el lápiz se editan en el lugar los datos
 * principales; desde ahí también se puede eliminar. La asistencia y el resto
 * de los datos se editan en el detalle.
 */
export function FilaInscripto({
  fila: f,
  opciones,
  familia,
  puedeEditar,
  puedeBorrar,
  grupos,
  seleccionada,
  alternarSeleccion,
}: {
  fila: Fila;
  opciones: Opcion[];
  familia: ResumenFamilia | undefined;
  puedeEditar: boolean;
  puedeBorrar: boolean;
  grupos: { id: number; nombre: string }[];
  seleccionada: boolean;
  alternarSeleccion: (marcada: boolean) => void;
}) {
  const contacto = f.nino.responsables[0];
  const inicial = () => ({
    nombre: f.nino.nombre,
    apellido: f.nino.apellido,
    dni: f.nino.dni,
    grupoEdadId: f.grupoEdadId ? String(f.grupoEdadId) : "",
    estado: f.estado,
    contactoNombre: contacto?.responsable.nombre ?? "",
    contactoApellido: contacto?.responsable.apellido ?? "",
    contactoWhatsapp: contacto ? formatearWhatsapp(contacto.responsable.whatsapp) : "",
  });
  const [editando, setEditando] = useState(false);
  const [abierta, setAbierta] = useState(false);
  const [editandoInfo, setEditandoInfo] = useState(false);
  const [textoInfo, setTextoInfo] = useState("");
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
        estado: valores.estado,
        contacto: contacto
          ? { nombre: valores.contactoNombre, apellido: valores.contactoApellido, whatsapp: valores.contactoWhatsapp }
          : null,
      });
      setResultado(r);
      if (r.ok) setEditando(false);
    });

  const guardarInfo = () =>
    iniciar(async () => {
      const r = await guardarInfoAdicional(f.id, textoInfo);
      setResultado(r);
      if (r.ok) setEditandoInfo(false);
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

  const asistencia = describirAsistencia(opciones, {
    modalidad: f.modalidad,
    opciones: f.semanas.map((s) => s.semanaId),
    dias: f.dias.map((d) => ({ fecha: fechaAIso(d.fecha), opcion: d.semanaId })),
  });
  const detalleDias = f.modalidad === "POR_DIA" ? f.dias.map((d) => formatearDiaCorto(fechaAIso(d.fecha))).join(", ") : undefined;
  const nombreCompleto = `${f.nino.nombre} ${f.nino.apellido}`;
  const info = f.nino.infoAdicional?.trim();
  const hermanos = familia?.chicos.filter((c) => c.id !== f.id) ?? [];
  const otrosContactos = f.nino.responsables.length - 1;

  return (
    <>
      <tr className={`align-top ${editando ? "bg-amarillo/10" : seleccionada ? "bg-rojo/5" : "hover:bg-crema/50"}`}>
        <td className="py-3 pl-3">
          {puedeBorrar && (
          <input
            type="checkbox"
            checked={seleccionada}
            onChange={(e) => alternarSeleccion(e.target.checked)}
            aria-label={`Seleccionar a ${f.nino.nombre} ${f.nino.apellido}`}
            className="mt-1 size-4 accent-marino"
          />
          )}
        </td>
        <td className="py-3 pl-1">
          <button
            type="button"
            onClick={() => setAbierta((a) => !a)}
            aria-expanded={abierta}
            aria-controls={`ficha-${f.id}`}
            aria-label={`${abierta ? "Cerrar" : "Ver"} ficha rápida de ${nombreCompleto}`}
            title={abierta ? "Cerrar ficha" : "Ver ficha rápida"}
            className="mt-0.5 rounded-md p-1 text-marino hover:bg-marino/10"
          >
            <IconoFlecha abierta={abierta} />
          </button>
        </td>
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
              {(info || hermanos.length > 0 || f.posibleDuplicado) && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {info && (
                    <span title={info} className="inline-block rounded-full bg-rojo/10 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-rojo">
                      Info adicional
                    </span>
                  )}
                  {hermanos.length > 0 && (
                    <span
                      title={hermanos.map((h) => `${h.nombre} ${h.apellido}`).join(", ")}
                      className="inline-block rounded-full bg-azul/15 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-marino"
                    >
                      {hermanos.length === 1 ? "1 hermano/a" : `${hermanos.length} hermanos`}
                    </span>
                  )}
                  {f.posibleDuplicado && <InsigniaDuplicado />}
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
                {otrosContactos > 0 && (
                  <div className="text-xs font-medium text-marino">
                    +{otrosContactos} {otrosContactos === 1 ? "contacto" : "contactos"}
                  </div>
                )}
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
              {puedeBorrar && (
                <button type="button" onClick={eliminar} disabled={pendiente} className={`${claseBotonChico} text-rojo underline-offset-2 hover:underline`}>
                  Eliminar
                </button>
              )}
            </div>
          ) : (
            puedeEditar && (
            <button
              type="button"
              onClick={empezar}
              aria-label={`Editar a ${nombreCompleto}`}
              title="Editar"
              className="rounded-lg border border-marino/20 p-1.5 text-marino transition hover:border-marino hover:bg-marino/5"
            >
              <IconoLapiz className="size-5" />
            </button>
            )
          )}
        </td>
      </tr>
      {abierta && (
        <tr id={`ficha-${f.id}`} className="bg-crema/40">
          <td />
          <td colSpan={10} className="px-3 pt-1 pb-4">
            <div className="grid gap-4 md:grid-cols-3">
              <section
                aria-label="Información adicional"
                className={`rounded-xl border p-3 ${info ? "border-rojo/30 bg-rojo/5" : "border-marino/10 bg-white"}`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className={`text-xs font-semibold tracking-wide uppercase ${info ? "text-rojo" : "text-marino"}`}>
                    Información adicional
                  </h3>
                  {!editandoInfo && puedeEditar && (
                    <button
                      type="button"
                      onClick={() => {
                        setTextoInfo(f.nino.infoAdicional ?? "");
                        setResultado(null);
                        setEditandoInfo(true);
                      }}
                      className="rounded-md px-1.5 text-xs font-semibold text-marino underline-offset-2 hover:underline"
                    >
                      {info ? "Editar" : "Agregar"}
                    </button>
                  )}
                </div>
                {editandoInfo ? (
                  <div className="space-y-2">
                    <textarea
                      aria-label={`Información adicional de ${nombreCompleto}`}
                      value={textoInfo}
                      onChange={(e) => setTextoInfo(e.target.value)}
                      rows={4}
                      maxLength={LARGO_MAXIMO.infoAdicional}
                      autoFocus
                      placeholder="Alergias, medicación, cuidados…"
                      className="w-full rounded-lg border-2 border-marino/20 bg-white px-2 py-1 text-sm focus:border-azul focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={guardarInfo} disabled={pendiente} className={`${claseBotonChico} bg-marino text-white hover:bg-marino/90`}>
                        {pendiente ? "Guardando…" : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoInfo(false)}
                        disabled={pendiente}
                        className={`${claseBotonChico} border-2 border-marino/20 text-marino hover:border-marino`}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className={`text-sm whitespace-pre-line ${info ? "font-medium text-rojo" : "text-texto/70"}`}>
                    {info || "No cargaron nada."}
                  </p>
                )}
                {f.notasAdmin && (
                  <>
                    <h3 className="mt-3 mb-1 text-xs font-semibold tracking-wide text-marino uppercase">Notas internas</h3>
                    <p className="text-sm whitespace-pre-line">{f.notasAdmin}</p>
                  </>
                )}
              </section>
              <section aria-label="Contactos" className="rounded-xl border border-marino/10 bg-white p-3">
                <h3 className="mb-1 text-xs font-semibold tracking-wide text-marino uppercase">Contactos</h3>
                <ul className="space-y-2 text-sm">
                  {f.nino.responsables.map((v) => (
                    <li key={v.responsableId} className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-medium">
                          {v.responsable.nombre} {v.responsable.apellido}
                        </span>
                        {v.parentesco && <span className="text-texto/80"> · {v.parentesco}</span>}
                        {v.esPrincipal && <span className="ml-1 rounded-full bg-amarillo px-1.5 text-xs text-marino">Principal</span>}
                        <div className="text-xs text-texto/80">
                          {formatearWhatsapp(v.responsable.whatsapp)}
                          {v.responsable.whatsappAlt && ` · otro: ${formatearWhatsapp(v.responsable.whatsappAlt)}`}
                          {v.responsable.email && ` · ${v.responsable.email}`}
                        </div>
                      </div>
                      <a
                        href={`https://wa.me/${v.responsable.whatsapp.replace("+", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Abrir WhatsApp con ${v.responsable.nombre} ${v.responsable.apellido}`}
                        className="shrink-0 rounded-lg border border-verde/50 p-1 text-marino hover:bg-verde/10"
                      >
                        <IconoWhatsapp className="size-4" />
                      </a>
                    </li>
                  ))}
                  {f.nino.responsables.length === 0 && <li className="text-rojo">Sin contactos</li>}
                </ul>
              </section>
              <section aria-label="Familia" className="rounded-xl border border-marino/10 bg-white p-3">
                <h3 className="mb-1 text-xs font-semibold tracking-wide text-marino uppercase">Hermanos en la temporada</h3>
                {hermanos.length === 0 ? (
                  <p className="text-sm text-texto/70">No tiene hermanos inscriptos.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {hermanos.map((h) => (
                      <li key={h.id}>
                        <Link href={`/admin/inscriptos/${h.id}`} className="font-medium text-marino underline-offset-2 hover:underline">
                          {h.nombre} {h.apellido}
                        </Link>
                        <div className="text-xs text-texto/80">
                          {h.grupo ?? "Sin grupo"} · {h.asistencia}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {familia && familia.chicos.length > 0 && (
                  <p className="mt-3 border-t border-marino/10 pt-2 text-sm">
                    Total de la familia: <strong className="tabular-nums">{formatearPrecio(familia.total.total)}</strong>
                    {familia.total.descuento > 0 && (
                      <span className="text-verde"> (descuento −{formatearPrecio(familia.total.descuento)})</span>
                    )}
                    {familia.total.incompleto && <span className="text-texto/70"> + días a confirmar</span>}
                  </p>
                )}
                <Link href={`/admin/inscriptos/${f.id}`} className="mt-3 inline-block text-sm font-semibold text-marino underline">
                  Ver ficha completa
                </Link>
              </section>
            </div>
          </td>
        </tr>
      )}
      {resultado && (
        <tr>
          <td colSpan={11} className={`px-3 pb-3 text-sm font-medium ${resultado.ok ? "text-marino" : "text-rojo"}`} role={resultado.ok ? "status" : "alert"}>
            {resultado.ok ? `${nombreCompleto}: ${resultado.mensaje}` : resultado.errores.join(" ")}
          </td>
        </tr>
      )}
    </>
  );
}
