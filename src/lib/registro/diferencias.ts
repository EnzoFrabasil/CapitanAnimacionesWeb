// Arma el detalle de un cambio para el registro: solo los campos que cambiaron,
// con su valor anterior y el nuevo. Nunca se guardan contraseñas ni hashes.

export type Valor = string | number | boolean | null;
export type Cambios = Record<string, { antes: Valor; despues: Valor }>;

const OCULTOS = /password|hash|token/i;

function normalizar(v: unknown): Valor {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, v.getUTCHours() || v.getUTCMinutes() ? 16 : 10);
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.map((x) => String(normalizar(x))).join(", ");
  return JSON.stringify(v);
}

/** Campos de `despues` que son distintos en `antes`. */
export function diferencias(antes: Record<string, unknown>, despues: Record<string, unknown>): Cambios {
  const cambios: Cambios = {};
  for (const [campo, nuevo] of Object.entries(despues)) {
    if (OCULTOS.test(campo)) continue;
    const a = normalizar(antes[campo]);
    const d = normalizar(nuevo);
    if (a !== d) cambios[campo] = { antes: a, despues: d };
  }
  return cambios;
}

/** Copia sin campos sensibles (para guardar lo que se cargó al crear algo). */
export function sinSecretos(datos: Record<string, unknown>): Record<string, Valor> {
  return Object.fromEntries(Object.entries(datos).filter(([k]) => !OCULTOS.test(k)).map(([k, v]) => [k, normalizar(v)]));
}
