// Rate limit simple en memoria (ventana fija por clave).
// En Vercel cada instancia tiene su propia memoria, así que el límite es
// aproximado: alcanza para frenar envíos automáticos, no es una garantía.

interface Ventana {
  inicio: number;
  cantidad: number;
}

export function crearRateLimit({ maximo, ventanaMs }: { maximo: number; ventanaMs: number }) {
  const ventanas = new Map<string, Ventana>();

  return function permitir(clave: string, ahora = Date.now()): boolean {
    // Limpieza ocasional para que el mapa no crezca sin límite.
    if (ventanas.size > 5_000) {
      for (const [k, v] of ventanas) if (ahora - v.inicio >= ventanaMs) ventanas.delete(k);
    }

    const actual = ventanas.get(clave);
    if (!actual || ahora - actual.inicio >= ventanaMs) {
      ventanas.set(clave, { inicio: ahora, cantidad: 1 });
      return true;
    }
    actual.cantidad++;
    return actual.cantidad <= maximo;
  };
}

/** IP del cliente según los headers del proxy (Vercel agrega x-forwarded-for). */
export function ipDeRequest(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "desconocida"
  );
}
