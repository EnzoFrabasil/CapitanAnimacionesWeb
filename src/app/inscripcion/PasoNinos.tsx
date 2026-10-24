"use client";

import { EDAD_MAXIMA, MAX_NINOS_POR_INSCRIPCION } from "@/config/inscripcion";
import { diasHabilesDeSemanas } from "@/lib/dominio/dias";
import { fechaAIso, fechaDesdeIso } from "@/lib/dominio/fechas";
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
  fechaMinima.setUTCFullYear(fechaMinima.getUTCFullYear() - EDAD_MAXIMA - 1);

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
                <OpcionesBotones
                  nombre={id("turno")}
                  leyenda="Turno"
                  opciones={[
                    { valor: "MANANA", etiqueta: "Mañana" },
                    { valor: "TARDE", etiqueta: "Tarde" },
                  ]}
                  valor={n.turno}
                  onCambio={(turno) => {
                    cambiar(i, { turno });
                    tocar(id("turno"));
                  }}
                  error={errorDe(id("turno"))}
                />
              </div>

              <div className="sm:col-span-2">
                <Asistencia nino={n} indice={i} contexto={contexto} cambiar={cambiar} tocar={tocar} errorDe={errorDe} />
              </div>
            </div>
          </section>
        );
      })}

      <MensajeError id="ninos-error" mensaje={errorDe("ninos")} />

      {ninos.length < MAX_NINOS_POR_INSCRIPCION ? (
        <button
          type="button"
          onClick={agregar}
          className="w-full rounded-2xl border-2 border-dashed border-marino/40 bg-white/60 px-4 py-4 font-titulo text-lg font-semibold text-marino transition hover:border-marino hover:bg-white"
        >
          + Agregar otro niño/a
        </button>
      ) : (
        <p className="text-center text-sm">Llegaste al máximo de {MAX_NINOS_POR_INSCRIPCION} chicos por inscripción.</p>
      )}
    </div>
  );
}

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
  const todasIds = contexto.semanas.map((s) => s.id);
  const todas = todasIds.length > 0 && todasIds.every((sid) => nino.semanas.includes(sid));

  const alternarSemana = (semanaId: number, marcada: boolean) => {
    cambiar(indice, (actual) => ({
      semanas: marcada ? [...actual.semanas, semanaId] : actual.semanas.filter((s) => s !== semanaId),
    }));
    tocar(`${base}.semanas`);
  };

  const alternarDia = (dia: string) => {
    cambiar(indice, (actual) => ({
      dias: actual.dias.includes(dia) ? actual.dias.filter((d) => d !== dia) : [...actual.dias, dia],
    }));
    tocar(`${base}.dias`);
  };

  return (
    <div className="space-y-3">
      <OpcionesBotones
        nombre={`${base}.modalidad`}
        leyenda="¿Cómo va a asistir?"
        opciones={[
          { valor: "SEMANAS", etiqueta: "Por semanas" },
          { valor: "POR_DIA", etiqueta: "Por día" },
        ]}
        valor={nino.modalidad}
        onCambio={(modalidad) => cambiar(indice, { modalidad })}
      />

      {nino.modalidad === "SEMANAS" ? (
        <fieldset aria-describedby={errorDe(`${base}.semanas`) ? `${base}.semanas-error` : undefined}>
          <legend className="sr-only">Semanas</legend>
          <div className="space-y-2">
            <Casilla
              id={`${base}.semanas.todas`}
              etiqueta="Todas las semanas"
              destacada
              marcada={todas}
              onCambio={(marcada) => {
                cambiar(indice, { semanas: marcada ? todasIds : [] });
                tocar(`${base}.semanas`);
              }}
            />
            {contexto.semanas.map((s) => (
              <Casilla
                key={s.id}
                id={`${base}.semanas.${s.id}`}
                etiqueta={
                  <>
                    Semana {s.numero}{" "}
                    <span className="text-texto/80">
                      ({formatearDiaCorto(s.fechaInicio)} al {formatearDiaCorto(s.fechaFin)})
                    </span>
                  </>
                }
                marcada={nino.semanas.includes(s.id)}
                onCambio={(marcada) => alternarSemana(s.id, marcada)}
              />
            ))}
          </div>
          <MensajeError id={`${base}.semanas-error`} mensaje={errorDe(`${base}.semanas`)} />
        </fieldset>
      ) : (
        <fieldset aria-describedby={errorDe(`${base}.dias`) ? `${base}.dias-error` : undefined}>
          <legend className="sr-only">Días</legend>
          <div className="space-y-3">
            {contexto.semanas.map((s) => (
              <div key={s.id}>
                <p className="mb-1 text-sm font-semibold text-marino">Semana {s.numero}</p>
                <div className="flex flex-wrap gap-2">
                  {diasHabilesDeSemanas([s]).map((dia) => {
                    const elegido = nino.dias.includes(dia);
                    return (
                      <button
                        key={dia}
                        type="button"
                        aria-pressed={elegido}
                        onClick={() => alternarDia(dia)}
                        className={`min-w-20 rounded-xl border-2 px-3 py-2 text-sm font-medium capitalize transition ${
                          elegido
                            ? "border-marino bg-marino text-white"
                            : "border-marino/20 bg-white hover:border-marino/50"
                        }`}
                      >
                        {formatearDiaCorto(dia)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <MensajeError id={`${base}.dias-error`} mensaje={errorDe(`${base}.dias`)} />
        </fieldset>
      )}
    </div>
  );
}
