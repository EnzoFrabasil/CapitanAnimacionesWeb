import Image from "next/image";

const POSICIONES = {
  "arriba-izquierda": "-left-6 -top-6 -rotate-12",
  "arriba-derecha": "-right-6 -top-6 rotate-12",
  "abajo-izquierda": "-bottom-6 -left-6 rotate-6",
  "abajo-derecha": "-bottom-6 -right-6 -rotate-6",
} as const;

/**
 * Ilustración decorativa en una esquina de una sección (la sección necesita
 * `relative overflow-hidden`). Es chica y semitransparente en el celular,
 * para no tapar contenido, y se oculta en pantallas muy angostas.
 */
export function Decoracion({
  src,
  posicion,
  className = "",
}: {
  src: string;
  posicion: keyof typeof POSICIONES;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute hidden select-none min-[420px]:block ${POSICIONES[posicion]} ${className}`}
    >
      <Image
        src={src}
        alt=""
        width={240}
        height={240}
        unoptimized={src.endsWith(".svg")}
        className="w-16 animate-flotar opacity-50 sm:w-20 md:w-28 md:opacity-90"
      />
    </div>
  );
}
