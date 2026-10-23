export interface ContactoExistente {
  responsableId: number;
  /** Familias de los niños ya vinculados a este responsable. */
  familiaIds: number[];
}

export interface FamiliaElegida {
  /** Familia a la que se suman los niños nuevos, o null para crear una nueva. */
  familiaId: number | null;
  /** Nota para el panel si los contactos ya existentes pertenecen a familias distintas. */
  notaAdmin: string | null;
}

/**
 * Regla 4: si algún contacto ya existe y tiene niños en una familia, los niños nuevos
 * se suman a esa familia. Se toma el primer contacto existente en el orden del formulario
 * (el principal primero) y, si tiene varias, su familia más antigua.
 * Si hay más de una familia en juego NO se unen: se deja una nota para revisar a mano.
 *
 * `contactos` va en el orden del formulario; null = contacto nuevo.
 */
export function elegirFamilia(contactos: readonly (ContactoExistente | null)[]): FamiliaElegida {
  let familiaId: number | null = null;
  const todas = new Set<number>();

  for (const c of contactos) {
    if (!c || c.familiaIds.length === 0) continue;
    if (familiaId === null) familiaId = Math.min(...c.familiaIds);
    for (const id of c.familiaIds) todas.add(id);
  }

  const notaAdmin =
    todas.size > 1
      ? `Los contactos de esta inscripción ya estaban vinculados a varias familias ` +
        `(${[...todas].sort((a, b) => a - b).map((id) => `#${id}`).join(", ")}). ` +
        `Se asignó la familia #${familiaId}. Revisar si corresponde unirlas.`
      : null;

  return { familiaId, notaAdmin };
}
