import { Prisma } from "@/generated/prisma/client";
import { hoyEnArgentina, fechaAIso } from "@/lib/dominio/fechas";
import { registrarInscripcion } from "@/lib/inscripcion/registrar";
import { crearRateLimit, ipDeRequest } from "@/lib/rate-limit";
import { buscarTemporadaAbierta } from "@/lib/temporada";
import { MENSAJE_FALTA_ACEPTAR, crearInscripcionSchema } from "@/lib/validacion/inscripcion";

// Respuestas posibles (nunca incluyen datos de otras inscripciones):
//   200 { ok: true, numero }
//   400 { ok: false, error, campos: [{ path, mensaje }] }
//   403 inscripciones cerradas · 409 cambió la temporada · 413 · 429 · 500

const permitir = crearRateLimit({ maximo: 10, ventanaMs: 15 * 60 * 1000 });
const TAMANO_MAXIMO = 100_000; // bytes

function error(status: number, mensaje: string) {
  return Response.json({ ok: false, error: mensaje }, { status });
}

export async function POST(request: Request) {
  if (!permitir(ipDeRequest(request.headers))) {
    return error(429, "Recibimos muchos envíos desde tu conexión. Esperá unos minutos y probá de nuevo.");
  }

  const texto = await request.text();
  if (texto.length > TAMANO_MAXIMO) return error(413, "El formulario es demasiado grande.");

  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return error(400, "No pudimos leer el formulario.");
  }
  if (typeof cuerpo !== "object" || cuerpo === null) return error(400, "No pudimos leer el formulario.");
  const { sitioWeb, temporadaId, aceptaPrivacidad, ...datos } = cuerpo as Record<string, unknown>;

  // Honeypot: un humano no ve este campo. A un bot le respondemos como si nada.
  if (typeof sitioWeb === "string" && sitioWeb.trim() !== "") {
    return Response.json({ ok: true, numero: 0 });
  }

  if (aceptaPrivacidad !== true) {
    return Response.json(
      {
        ok: false,
        error: "Falta marcar la casilla de aceptación.",
        campos: [{ path: "aceptaPrivacidad", mensaje: MENSAJE_FALTA_ACEPTAR }],
      },
      { status: 400 },
    );
  }

  const temporada = await buscarTemporadaAbierta();
  if (!temporada) return error(403, "Las inscripciones están cerradas.");
  if (temporadaId !== temporada.id) {
    return error(409, "La temporada cambió mientras completabas el formulario. Recargá la página y revisá los datos.");
  }

  const hoy = hoyEnArgentina();
  const resultado = crearInscripcionSchema({ semanas: temporada.semanas, hoy: fechaAIso(hoy) }).safeParse(datos);
  if (!resultado.success) {
    return Response.json(
      {
        ok: false,
        error: "Revisá los datos marcados.",
        campos: resultado.error.issues.map((i) => ({ path: i.path.join("."), mensaje: i.message })),
      },
      { status: 400 },
    );
  }

  // Un reintento si dos envíos simultáneos crean el mismo contacto nuevo.
  for (let intento = 1; ; intento++) {
    try {
      const numero = await registrarInscripcion(resultado.data, temporada, hoy);
      return Response.json({ ok: true, numero });
    } catch (e) {
      const conflicto = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (conflicto && intento < 2) continue;
      // Sin datos personales en el log: solo el tipo y código de error.
      console.error(
        "Error al registrar inscripción:",
        e instanceof Prisma.PrismaClientKnownRequestError ? e.code : e instanceof Error ? e.name : "desconocido",
      );
      return error(500, "No pudimos guardar la inscripción. Probá de nuevo en unos minutos.");
    }
  }
}
