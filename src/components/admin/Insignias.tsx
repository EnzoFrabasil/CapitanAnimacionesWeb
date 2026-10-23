import { ETIQUETA_ESTADO } from "@/lib/formato";

const COLOR_ESTADO = {
  EN_ESPERA: "bg-amarillo",
  CONFIRMADO: "bg-verde",
  CANCELADO: "bg-rojo",
} as const;

export function InsigniaEstado({ estado }: { estado: keyof typeof COLOR_ESTADO }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-marino/15 bg-white px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-marino">
      <span aria-hidden className={`size-2 rounded-full ${COLOR_ESTADO[estado]}`} />
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

export function InsigniaDuplicado() {
  return (
    <span
      title="Ya había un niño/a con este DNI inscripto en la temporada"
      className="inline-block rounded-full bg-rojo/10 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-rojo"
    >
      Posible duplicado
    </span>
  );
}

export function InsigniaSinGrupo() {
  return (
    <span className="inline-block rounded-full bg-amarillo/25 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-marino">
      Sin grupo
    </span>
  );
}
