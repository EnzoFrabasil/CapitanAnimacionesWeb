import type { ReactNode } from "react";
import { claseEtiqueta, claseInput } from "./estilos";

/** Campo simple (no controlado) para los formularios del panel. */
export function Campo({
  nombre,
  etiqueta,
  valor,
  tipo = "text",
  requerido,
  className = "",
  ayuda,
  ...resto
}: {
  nombre: string;
  etiqueta: string;
  valor?: string | number | null;
  tipo?: string;
  requerido?: boolean;
  className?: string;
  ayuda?: ReactNode;
  min?: string | number;
  max?: string | number;
  inputMode?: "numeric" | "tel" | "email" | "text";
  idPrefijo?: string;
}) {
  const { idPrefijo, ...attrs } = resto;
  const id = `${idPrefijo ?? "campo"}-${nombre}`;
  return (
    <div className={className}>
      <label htmlFor={id} className={claseEtiqueta}>
        {etiqueta}
      </label>
      <input
        id={id}
        name={nombre}
        type={tipo}
        defaultValue={valor ?? ""}
        required={requerido}
        className={claseInput}
        {...attrs}
      />
      {ayuda && <p className="mt-1 text-xs text-texto/80">{ayuda}</p>}
    </div>
  );
}

export function Selector({
  nombre,
  etiqueta,
  valor,
  opciones,
  className = "",
  idPrefijo,
}: {
  nombre: string;
  etiqueta: string;
  valor?: string | number | null;
  opciones: { valor: string | number; texto: string }[];
  className?: string;
  idPrefijo?: string;
}) {
  const id = `${idPrefijo ?? "campo"}-${nombre}`;
  return (
    <div className={className}>
      <label htmlFor={id} className={claseEtiqueta}>
        {etiqueta}
      </label>
      <select id={id} name={nombre} defaultValue={valor ?? ""} className={claseInput}>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </div>
  );
}
