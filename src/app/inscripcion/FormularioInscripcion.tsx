"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { crearInscripcionSchema, type ContextoInscripcion } from "@/lib/validacion/inscripcion";
import { Exito } from "./Exito";
import { PasoContactos } from "./PasoContactos";
import { PasoNinos } from "./PasoNinos";
import { PasoRevision } from "./PasoRevision";
import type { ContactoForm, NinoForm } from "./tipos";

const PASOS = ["Contactos", "Niños", "Revisión"] as const;

const contactoVacio = (): ContactoForm => ({
  nombre: "",
  apellido: "",
  parentesco: "",
  whatsapp: "",
  whatsappAlt: "",
  email: "",
});

const ninoVacio = (clave: number, apellido = ""): NinoForm => ({
  clave,
  nombre: "",
  apellido,
  dni: "",
  fechaNacimiento: "",
  infoAdicional: "",
  turno: "",
  modalidad: "SEMANAS",
  semanas: [],
  dias: [],
});

/** Paso del formulario al que pertenece el error de un campo. */
const pasoDe = (path: string) => (path.startsWith("contactos") ? 0 : 1);

interface Props {
  temporadaId: number;
  nombreTemporada: string;
  contexto: ContextoInscripcion;
}

export function FormularioInscripcion({ temporadaId, nombreTemporada, contexto }: Props) {
  const schema = useMemo(() => crearInscripcionSchema(contexto), [contexto]);
  const proximaClave = useRef(1);

  const [paso, setPaso] = useState(0);
  const [contactos, setContactos] = useState<ContactoForm[]>([contactoVacio()]);
  const [ninos, setNinos] = useState<NinoForm[]>([ninoVacio(0)]);
  const [sitioWeb, setSitioWeb] = useState(""); // honeypot
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const [pasosIntentados, setPasosIntentados] = useState<Set<number>>(new Set());
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [numero, setNumero] = useState<number | null>(null);

  const datos = { contactos, ninos: ninos.map(({ clave, ...n }) => n) };
  const resultado = schema.safeParse(datos);

  const errores: Record<string, string> = {};
  if (!resultado.success) {
    for (const issue of resultado.error.issues) {
      const path = issue.path.join(".");
      errores[path] ??= issue.message;
    }
  }

  // Los errores se muestran al salir del campo o al intentar avanzar de paso.
  const errorDe = (path: string) =>
    erroresServidor[path] ??
    (tocados.has(path) || pasosIntentados.has(pasoDe(path)) ? errores[path] : undefined);

  const tocar = (path: string) => setTocados((t) => (t.has(path) ? t : new Set(t).add(path)));

  const alEditar = () => {
    if (Object.keys(erroresServidor).length) setErroresServidor({});
    setErrorGeneral(null);
  };

  const irArriba = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // Se enfoca el primer campo con error después de que React pinte los errores.
  const [pedidoFoco, setPedidoFoco] = useState(0);
  const enfocarPrimerError = () => setPedidoFoco((n) => n + 1);
  useEffect(() => {
    if (pedidoFoco === 0) return;
    const campo = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalido="true"]');
    campo?.focus({ preventScroll: true });
    campo?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [pedidoFoco]);

  const irAPaso = (destino: number) => {
    setPaso(destino);
    irArriba();
  };

  const siguiente = () => {
    setPasosIntentados((p) => new Set(p).add(paso));
    if (Object.keys(errores).some((path) => pasoDe(path) === paso)) {
      enfocarPrimerError();
      return;
    }
    irAPaso(paso + 1);
  };

  const enviar = async () => {
    if (!resultado.success || enviando) return;
    setEnviando(true);
    setErrorGeneral(null);
    try {
      const respuesta = await fetch("/api/inscripciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datos, temporadaId, sitioWeb }),
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as {
        ok?: boolean;
        numero?: number;
        error?: string;
        campos?: { path: string; mensaje: string }[];
      } | null;

      if (respuesta.ok && cuerpo?.ok && typeof cuerpo.numero === "number") {
        setNumero(cuerpo.numero);
        irArriba();
        return;
      }

      setErrorGeneral(cuerpo?.error ?? "No pudimos enviar la inscripción. Probá de nuevo en unos minutos.");
      if (cuerpo?.campos?.length) {
        const mapa: Record<string, string> = {};
        for (const c of cuerpo.campos) mapa[c.path] ??= c.mensaje;
        setErroresServidor(mapa);
        setPasosIntentados(new Set([0, 1]));
        setPaso(pasoDe(cuerpo.campos[0].path));
        enfocarPrimerError();
      }
    } catch {
      setErrorGeneral("No pudimos conectarnos. Revisá tu conexión a internet y probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  if (numero !== null) return <Exito numero={numero} />;

  return (
    <div>
      <h1 className="font-titulo text-3xl font-bold text-marino sm:text-4xl">¡Sumate a la tripulación!</h1>
      <p className="mt-1 text-lg">Inscripción a la {nombreTemporada}</p>

      <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Pasos de la inscripción">
        {PASOS.map((nombre, i) => (
          <li key={nombre} aria-current={i === paso ? "step" : undefined}>
            <div className={`h-2 rounded-full transition-colors ${i <= paso ? "bg-naranja" : "bg-marino/15"}`} />
            <p className={`mt-1 text-sm ${i === paso ? "font-semibold text-marino" : "text-texto/80"}`}>
              {i + 1}. {nombre}
            </p>
          </li>
        ))}
      </ol>

      <form
        noValidate
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (paso < 2) siguiente();
          else void enviar();
        }}
      >
        <h2 className="mb-4 font-titulo text-2xl font-semibold text-marino">{PASOS[paso]}</h2>

        {/* Honeypot: invisible para personas, los bots suelen completarlo. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="sitioWeb">No completar este campo</label>
          <input
            id="sitioWeb"
            name="sitioWeb"
            tabIndex={-1}
            autoComplete="off"
            value={sitioWeb}
            onChange={(e) => setSitioWeb(e.target.value)}
          />
        </div>

        {paso === 0 && (
          <PasoContactos
            contactos={contactos}
            errorDe={errorDe}
            tocar={tocar}
            cambiar={(i, campo, valor) => {
              alEditar();
              setContactos((cs) => cs.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)));
            }}
            agregar={() => setContactos((cs) => [...cs, contactoVacio()])}
            quitar={(i) => setContactos((cs) => cs.filter((_, j) => j !== i))}
          />
        )}

        {paso === 1 && (
          <PasoNinos
            ninos={ninos}
            contexto={contexto}
            errorDe={errorDe}
            tocar={tocar}
            cambiar={(i, cambios) => {
              alEditar();
              setNinos((ns) =>
                ns.map((n, j) => (j === i ? { ...n, ...(typeof cambios === "function" ? cambios(n) : cambios) } : n)),
              );
            }}
            agregar={() =>
              // El apellido del primero suele repetirse entre hermanos.
              setNinos((ns) => [...ns, ninoVacio(proximaClave.current++, ns[0]?.apellido ?? "")])
            }
            quitar={(i) => setNinos((ns) => ns.filter((_, j) => j !== i))}
          />
        )}

        {paso === 2 && resultado.success && (
          <PasoRevision datos={resultado.data} contexto={contexto} irAPaso={irAPaso} />
        )}

        {errorGeneral && (
          <p role="alert" className="mt-6 rounded-2xl border-2 border-rojo bg-white p-4 font-medium text-rojo">
            {errorGeneral}
          </p>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {paso > 0 ? (
            <button
              type="button"
              onClick={() => irAPaso(paso - 1)}
              className="rounded-full border-2 border-marino px-6 py-3 font-titulo text-lg font-semibold text-marino transition hover:bg-marino hover:text-white"
            >
              Volver
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={enviando}
            className="rounded-full bg-naranja px-8 py-3 font-titulo text-xl font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-wait disabled:opacity-70"
          >
            {paso < 2 ? "Siguiente" : enviando ? "Enviando…" : "Enviar inscripción"}
          </button>
        </div>
      </form>
    </div>
  );
}
