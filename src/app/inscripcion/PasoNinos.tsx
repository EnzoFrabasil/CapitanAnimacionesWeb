"use client";

import { EDAD_MAXIMA, EDAD_MINIMA, MAX_NINOS_POR_INSCRIPCION } from "@/config/inscripcion";
import { maximoNinosPorFormulario } from "@/lib/dominio/cupos";
import { fechaAIso, fechaDesdeIso } from "@/lib/dominio/fechas";
import {
  claveHorario,
  diasDeOpcion,
  formatearPrecio,
  horarios,
  horariosElegidos,
  rangoDeFechas,
  textoHorario,
  type Opcion,
} from "@/lib/dominio/opciones";
import { formatearDiaCorto } from "@/lib/formato";
import { edadParaMostrar, type ContextoInscripcion } from "@/lib/validacion/inscripcion";
import { CampoTexto, Casilla, MensajeError, OpcionesBotones, claseInput } from "./campos";
import { ACENTOS, type ErrorDe, type NinoForm } from "./tipos";

interface Props {
  intro: string;
  ayudaInfoAdicional: string;
  ninos: NinoForm[];
  contexto: ContextoInscripcion;
  /** Los cambios pueden calcularse a partir del estado actual (para toggles rápidos). */
  cambiar: (indice: number, cambios: Partial<NinoForm> | ((actual: NinoForm) => Partial<NinoForm>)) => void;
  tocar: (path: string) => void;
  agregar: () => void;
  quitar: (indice: number) => void;
  errorDe: ErrorDe;
}

export function PasoNinos({ intro, ayudaInfoAdicional, ninos, contexto, cambiar, tocar, agregar, quitar, errorDe }: Props) {
  const hoy = fechaDesdeIso(contexto.hoy);
  const fechaMinima = new Date(hoy);
  const edades = contexto.edades ?? { minima: EDAD_MINIMA, maxima: EDAD_MAXIMA };
  const maximo = maximoNinosPorFormulario(MAX_NINOS_POR_INSCRIPCION, contexto.lugares ?? null);
  const limitaCupo = maximo < MAX_NINOS_POR_INSCRIPCION;
  fechaMinima.setUTCFullYear(fechaMinima.getUTCFullYear() - edades.maxima - 1);

  return (
    <div className="space-y-6">
      {intro && <p className="whitespace-pre-line">{intro}</p>}

      {ninos.map((n, i) => {
        const acento = ACENTOS[i % ACENTOS.length];
        const id = (campo: string) => `ninos.${i}.${campo}`;
        const texto = (campo: "nombre" | "apellido" | "dni" | "fechaNacimiento") => ({
          id: id(campo),
          valor: n[campo],
          onCambio: (v: string) => cambiar(i, { [campo]: v }),
          onSalir: () => tocar(id(campo)),
          error: errorDe(id(campo)),
        });
        const edad = edadParaMostrar(n.fechaNacimiento, contexto.hoy);

        return (
          <section
            key={n.clave}
            aria-labelledby={`nino-${i}-titulo`}
            className={`animate-aparecer rounded-3xl border-t-8 bg-white p-5 shadow-md sm:p-6 ${acento.borde}`}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 id={`nino-${i}-titulo`} className="flex items-center gap-2 font-titulo text-xl font-semibold text-marino">
                <span aria-hidden className={`size-3 rounded-full ${acento.punto}`} />
                {n.nombre.trim() || `Niño/a ${i + 1}`}
              </h3>
              {ninos.length > 1 && (
                <button
                  type="button"
                  onClick={() => quitar(i)}
                  className="rounded-full px-3 py-1 text-sm font-medium text-rojo underline-offset-4 hover:underline"
                >
                  Quitar
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto {...texto("nombre")} etiqueta="Nombre" autoComplete="off" />
              <CampoTexto {...texto("apellido")} etiqueta="Apellido" autoComplete="off" />
              <CampoTexto
                {...texto("dni")}
                etiqueta="Documento"
                autoComplete="off"
                placeholder="45.123.456"
                ayuda="DNI, cédula o pasaporte."
              />
              <CampoTexto
                {...texto("fechaNacimiento")}
                etiqueta="Fecha de nacimiento"
                tipo="date"
                ayuda={`La colonia es para chicos de ${edades.minima} a ${edades.maxima} años.`}
                min={fechaAIso(fechaMinima)}
                max={contexto.hoy}
                extra={
                  edad !== null && (
                    <span className="shrink-0 rounded-full bg-crema px-3 py-1 text-sm font-semibold text-marino" aria-live="polite">
                      {edad} {edad === 1 ? "año" : "años"}
                    </span>
                  )
                }
              />

              <div className="sm:col-span-2">
                <label htmlFor={id("infoAdicional")} className="mb-1 block font-medium text-marino">
                  Información adicional <span className="font-normal text-texto/70">(opcional)</span>
                </label>
                <textarea
                  id={id("infoAdicional")}
                  rows={3}
                  value={n.infoAdicional}
                  onChange={(e) => cambiar(i, { infoAdicional: e.target.value })}
                  onBlur={() => tocar(id("infoAdicional"))}
                  aria-describedby={ayudaInfoAdicional ? `${id("infoAdicional")}-ayuda` : undefined}
                  aria-invalid={errorDe(id("infoAdicional")) ? true : undefined}
                  className={claseInput(Boolean(errorDe(id("infoAdicional"))))}
                />
                {ayudaInfoAdicional && (
                  <p id={`${id("infoAdicional")}-ayuda`} className="mt-1 text-sm text-texto/80">
                    {ayudaInfoAdicional}
                  </p>
                )}
                <MensajeError id={`${id("infoAdicional")}-error`} mensaje={errorDe(id("infoAdicional"))} />
              </div>

              <div className="sm:col-span-2">
                <Asistencia nino={n} indice={i} contexto={contexto} cambiar={cambiar} tocar={tocar} errorDe={errorDe} />
              </div>
            </div>
          </section>
        );
      })}

      <MensajeError id="ninos-error" mensaje={errorDe("ninos")} />

      {ninos.length < maximo ? (
        <button
          type="button"
          onClick={agregar}
          className="w-full rounded-2xl border-2 border-dashed border-marino/40 bg-white/60 px-4 py-4 font-titulo text-lg font-semibold text-marino transition hover:border-marino hover:bg-white"
        >
          + Agregar otro niño/a
        </button>
      ) : (
        <p className="text-center text-sm">
          {limitaCupo
            ? `${maximo === 1 ? "Queda 1 lugar" : `Quedan ${maximo} lugares`} en la colonia: no se pueden sumar más chicos.`
            : `Llegaste al máximo de ${MAX_NINOS_POR_INSCRIPCION} chicos por inscripción.`}
        </p>
      )}
    </div>
  );
}

function Precio({ pesos }: { pesos: number | null | undefined }) {
  if (!pesos) return null;
  return <span className="font-titulo font-semibold whitespace-nowrap text-marino">{formatearPrecio(pesos)}</span>;
}

const fechas = (desde: string, hasta: string) => `${formatearDiaCorto(desde)} al ${formatearDiaCorto(hasta)}`;

/**
 * Opciones de inscripción agrupadas por horario. Se pueden elegir varias, pero
 * todas del mismo horario: las de los otros horarios quedan deshabilitadas.
 * Si un horario tiene más de una opción, "Colonia completa" las marca todas.
 */
function Asistencia({
  nino,
  indice,
  contexto,
  cambiar,
  tocar,
  errorDe,
}: {
  nino: NinoForm;
  indice: number;
  contexto: ContextoInscripcion;
  cambiar: Props["cambiar"];
  tocar: Props["tocar"];
  errorDe: ErrorDe;
}) {
  const base = `ninos.${indice}`;
  const modalidades = contexto.modalidades ?? ["SEMANAS"];
  const grupos = horarios(contexto.opciones);
  const precioCompleta = contexto.precios?.coloniaCompleta;
  const precioDia = contexto.precios?.dia;

  // Horario ya elegido (por opciones o por días): los demás quedan deshabilitados.
  const elegido =
    nino.modalidad === "SEMANAS"
      ? horariosElegidos(contexto.opciones, nino.semanas)[0]
      : horariosElegidos(
          contexto.opciones,
          nino.dias.map((d) => d.opcion),
        )[0];
  const otroHorario = (clave: string) => elegido !== undefined && elegido !== clave;

  const alternarOpcion = (opcionId: number, marcada: boolean) => {
    cambiar(indice, (actual) => ({
      semanas: marcada ? [...actual.semanas, opcionId] : actual.semanas.filter((s) => s !== opcionId),
    }));
    tocar(`${base}.semanas`);
  };

  const alternarDia = (fecha: string, opcion: number) => {
    cambiar(indice, (actual) => ({
      dias: actual.dias.some((d) => d.fecha === fecha)
        ? actual.dias.filter((d) => d.fecha !== fecha)
        : [...actual.dias, { fecha, opcion }],
    }));
    tocar(`${base}.dias`);
  };

  const avisoUnHorario = grupos.length > 1 && elegido !== undefined && (
    <p className="text-sm text-texto/80">Se puede elegir un solo horario. Para cambiarlo, desmarcá lo elegido.</p>
  );

  return (
    <div className="space-y-3">
      {modalidades.length > 1 ? (
        <OpcionesBotones
          nombre={`${base}.modalidad`}
          leyenda="¿Cómo va a asistir?"
          opciones={[
            { valor: "SEMANAS", etiqueta: "Opciones de la colonia" },
            { valor: "POR_DIA", etiqueta: "Días sueltos" },
          ]}
          valor={nino.modalidad}
          onCambio={(modalidad) => cambiar(indice, { modalidad })}
        />
      ) : (
        <p className="font-medium text-marino">¿A qué va a asistir?</p>
      )}

      {nino.modalidad === "SEMANAS" ? (
        <fieldset aria-describedby={errorDe(`${base}.semanas`) ? `${base}.semanas-error` : undefined}>
          <legend className="sr-only">Opciones de la colonia</legend>
          <div className="space-y-4">
            {avisoUnHorario}
            {grupos.map((g) => {
              const ids = g.opciones.map((o) => o.id);
              const todas = ids.every((oid) => nino.semanas.includes(oid));
              const bloqueado = otroHorario(g.clave);
              return (
                <div key={g.clave} className="space-y-2">
                  <p className="text-sm font-semibold text-marino">Horario: {g.texto}</p>
                  {g.opciones.length > 1 && (
                    <Casilla
                      id={`${base}.semanas.completa.${g.clave}`}
                      etiqueta={
                        <>
                          Colonia completa{" "}
                          <span className="font-normal text-texto/80">
                            ({fechas(rangoDeFechas(g.opciones).desde, rangoDeFechas(g.opciones).hasta)})
                          </span>
                        </>
                      }
                      extra={<Precio pesos={precioCompleta} />}
                      destacada
                      deshabilitada={bloqueado}
                      marcada={todas}
                      onCambio={(marcada) => {
                        cambiar(indice, { semanas: marcada ? ids : [] });
                        tocar(`${base}.semanas`);
                      }}
                    />
                  )}
                  {g.opciones.map((o: Opcion) => (
                    <Casilla
                      key={o.id}
                      id={`${base}.semanas.${o.id}`}
                      etiqueta={
                        <>
                          {o.nombre} <span className="text-texto/80">({fechas(o.fechaInicio, o.fechaFin)})</span>
                        </>
                      }
                      extra={<Precio pesos={o.precio} />}
                      deshabilitada={bloqueado}
                      marcada={nino.semanas.includes(o.id)}
                      onCambio={(marcada) => alternarOpcion(o.id, marcada)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
          <MensajeError id={`${base}.semanas-error`} mensaje={errorDe(`${base}.semanas`)} />
        </fieldset>
      ) : (
        <fieldset aria-describedby={errorDe(`${base}.dias`) ? `${base}.dias-error` : undefined}>
          <legend className="sr-only">Días sueltos</legend>
          <div className="space-y-4">
            {precioDia ? (
              <p className="text-sm">
                Cada día: <Precio pesos={precioDia} />
              </p>
            ) : null}
            {avisoUnHorario}
            {contexto.opciones.map((o) => {
              const bloqueado = otroHorario(claveHorario(o));
              return (
                <div key={o.id} className={bloqueado ? "opacity-50" : ""}>
                  <p className="mb-1 text-sm font-semibold text-marino">
                    {o.nombre} · {textoHorario(o)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {diasDeOpcion(o).map((dia) => {
                      const marcado = nino.dias.some((d) => d.fecha === dia && d.opcion === o.id);
                      // Un mismo día no se puede elegir dos veces (desde otra opción del mismo horario).
                      const ocupado = !marcado && nino.dias.some((d) => d.fecha === dia);
                      return (
                        <button
                          key={dia}
                          type="button"
                          aria-pressed={marcado}
                          disabled={bloqueado || ocupado}
                          onClick={() => alternarDia(dia, o.id)}
                          className={`min-w-20 rounded-xl border-2 px-3 py-2 text-sm font-medium capitalize transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            marcado ? "border-marino bg-marino text-white" : "border-marino/20 bg-white hover:border-marino/50"
                          }`}
                        >
                          {formatearDiaCorto(dia)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <MensajeError id={`${base}.dias-error`} mensaje={errorDe(`${base}.dias`)} />
        </fieldset>
      )}
    </div>
  );
}
