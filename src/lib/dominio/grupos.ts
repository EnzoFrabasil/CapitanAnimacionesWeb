export interface GrupoEdadEntrada {
  nombre: string;
  edadMin: number;
  edadMax: number;
}

/**
 * Valida el conjunto de grupos de una temporada: enteros >= 0, edadMin <= edadMax,
 * nombres no repetidos y rangos (inclusivos) sin superposición.
 * Devuelve la lista de errores (vacía si está todo bien).
 */
export function validarGruposEdad(grupos: readonly GrupoEdadEntrada[]): string[] {
  const errores: string[] = [];

  for (const g of grupos) {
    const nombre = g.nombre.trim() || "(sin nombre)";
    if (!g.nombre.trim()) errores.push("Todos los grupos necesitan un nombre.");
    if (!Number.isInteger(g.edadMin) || !Number.isInteger(g.edadMax) || g.edadMin < 0 || g.edadMax < 0) {
      errores.push(`"${nombre}": las edades tienen que ser números enteros mayores o iguales a 0.`);
    } else if (g.edadMin > g.edadMax) {
      errores.push(`"${nombre}": la edad mínima no puede ser mayor que la máxima.`);
    }
  }

  const vistos = new Set<string>();
  for (const g of grupos) {
    const clave = g.nombre.trim().toLocaleLowerCase("es");
    if (clave && vistos.has(clave)) errores.push(`El nombre "${g.nombre.trim()}" está repetido.`);
    vistos.add(clave);
  }

  if (errores.length > 0) return errores;

  const ordenados = [...grupos].sort((a, b) => a.edadMin - b.edadMin);
  for (let i = 1; i < ordenados.length; i++) {
    const anterior = ordenados[i - 1];
    const actual = ordenados[i];
    if (actual.edadMin <= anterior.edadMax) {
      errores.push(
        `"${anterior.nombre.trim()}" (${anterior.edadMin} a ${anterior.edadMax}) y ` +
          `"${actual.nombre.trim()}" (${actual.edadMin} a ${actual.edadMax}) se superponen.`,
      );
    }
  }
  return errores;
}
