"use client";

import type { ReactNode } from "react";
import { CODIGO_PAIS_INICIAL, paisesDelCodigo, separarTelefono, unirTelefono } from "@/lib/dominio/telefono";

// Piezas de formulario accesibles: etiqueta asociada, ayuda y error leídos por lectores de pantalla.

export const claseInput = (conError: boolean) =>
  `w-full rounded-xl border-2 bg-white px-4 py-3 text-base text-texto placeholder:text-texto/50 transition focus:outline-none focus:ring-4 ${
    conError ? "border-rojo focus:ring-rojo/20" : "border-marino/20 focus:border-azul focus:ring-azul/20"
  }`;

export function MensajeError({ id, mensaje }: { id: string; mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p id={id} className="mt-1 text-sm font-medium text-rojo" role="alert">
      {mensaje}
    </p>
  );
}

interface CampoTextoProps {
  id: string;
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  onSalir: () => void;
  error?: string;
  ayuda?: string;
  opcional?: boolean;
  tipo?: "text" | "tel" | "email" | "date";
  inputMode?: "text" | "tel" | "numeric" | "email";
  autoComplete?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  extra?: ReactNode;
}

export function CampoTexto(p: CampoTextoProps) {
  const descripcion = [p.ayuda && `${p.id}-ayuda`, p.error && `${p.id}-error`].filter(Boolean).join(" ");
  return (
    <div>
      <label htmlFor={p.id} className="mb-1 block font-medium text-marino">
        {p.etiqueta}
        {p.opcional && <span className="font-normal text-texto/70"> (opcional)</span>}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={p.id}
          type={p.tipo ?? "text"}
          inputMode={p.inputMode}
          autoComplete={p.autoComplete}
          placeholder={p.placeholder}
          min={p.min}
          max={p.max}
          value={p.valor}
          onChange={(e) => p.onCambio(e.target.value)}
          onBlur={p.onSalir}
          aria-invalid={p.error ? true : undefined}
          aria-describedby={descripcion || undefined}
          className={claseInput(Boolean(p.error))}
        />
        {p.extra}
      </div>
      {p.ayuda && (
        <p id={`${p.id}-ayuda`} className="mt-1 text-sm text-texto/80">
          {p.ayuda}
        </p>
      )}
      <MensajeError id={`${p.id}-error`} mensaje={p.error} />
    </div>
  );
}

/** Grupo de opciones (radio) con aspecto de botones grandes, cómodo en el celular. */
export function OpcionesBotones<T extends string>({
  nombre,
  leyenda,
  opciones,
  valor,
  onCambio,
  error,
}: {
  nombre: string;
  leyenda: string;
  opciones: readonly { valor: T; etiqueta: string }[];
  valor: T | "";
  onCambio: (valor: T) => void;
  error?: string;
}) {
  return (
    <fieldset aria-describedby={error ? `${nombre}-error` : undefined}>
      <legend className="mb-1 font-medium text-marino">{leyenda}</legend>
      <div className="grid grid-cols-2 gap-2">
        {opciones.map((o) => (
          <label key={o.valor} className="cursor-pointer">
            <input
              type="radio"
              name={nombre}
              value={o.valor}
              checked={valor === o.valor}
              onChange={() => onCambio(o.valor)}
              data-invalido={error ? true : undefined}
              className="peer sr-only"
            />
            <span
              className={`block rounded-xl border-2 px-4 py-3 text-center font-medium transition peer-checked:border-marino peer-checked:bg-marino peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-azul/30 ${
                error ? "border-rojo" : "border-marino/20 bg-white hover:border-marino/50"
              }`}
            >
              {o.etiqueta}
            </span>
          </label>
        ))}
      </div>
      <MensajeError id={`${nombre}-error`} mensaje={error} />
    </fieldset>
  );
}

export function Casilla({
  id,
  etiqueta,
  marcada,
  onCambio,
  destacada,
  deshabilitada,
  extra,
}: {
  id: string;
  etiqueta: ReactNode;
  marcada: boolean;
  onCambio: (marcada: boolean) => void;
  destacada?: boolean;
  deshabilitada?: boolean;
  /** Se muestra a la derecha (por ejemplo, el precio). */
  extra?: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition ${
        deshabilitada
          ? "cursor-not-allowed border-marino/10 bg-white/60 opacity-60"
          : `cursor-pointer hover:border-marino/50 ${marcada ? "border-marino bg-marino/5" : "border-marino/20 bg-white"}`
      } ${destacada ? "font-semibold" : ""}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={marcada}
        disabled={deshabilitada}
        onChange={(e) => onCambio(e.target.checked)}
        className="size-5 shrink-0 accent-marino"
      />
      <span className="flex-1">{etiqueta}</span>
      {extra && <span className="shrink-0 text-right">{extra}</span>}
    </label>
  );
}

const nombresDePais = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["es"], { type: "region" }) : null;

/** "Argentina", "Estados Unidos, Canadá y otros", etc. según el código de país. */
function paisDelCodigo(codigo: string): string {
  const paises = paisesDelCodigo(codigo);
  if (paises.length === 0) return codigo ? "Código desconocido" : "Código de país";
  const nombres = paises.map((p) => nombresDePais?.of(p) ?? p);
  return nombres.length > 2 ? `${nombres.slice(0, 2).join(", ")} y otros` : nombres.join(" o ");
}

/**
 * Teléfono en dos partes: código de país (arranca en 54, con el país debajo) y
 * el resto del número. Hacia afuera trabaja con un solo texto "+54 11 2345-6789".
 */
export function CampoTelefono(p: {
  id: string;
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  onSalir: () => void;
  error?: string;
  ayuda?: string;
  opcional?: boolean;
  autoComplete?: string;
}) {
  const { codigo, numero } = separarTelefono(p.valor);
  const descripcion = [p.ayuda && `${p.id}-ayuda`, p.error && `${p.id}-error`].filter(Boolean).join(" ");
  return (
    <div>
      <label htmlFor={p.id} className="mb-1 block font-medium text-marino">
        {p.etiqueta}
        {p.opcional && <span className="font-normal text-texto/70"> (opcional)</span>}
      </label>
      <div className="flex items-start gap-2">
        <div className="w-24 shrink-0">
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto/70">
              +
            </span>
            <input
              id={`${p.id}-codigo`}
              aria-label={`Código de país de ${p.etiqueta.toLowerCase()}`}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={codigo}
              onChange={(e) => p.onCambio(unirTelefono(e.target.value.replace(/\D/g, ""), numero))}
              onBlur={p.onSalir}
              aria-describedby={`${p.id}-pais`}
              className={`${claseInput(Boolean(p.error))} pl-6!`}
            />
          </div>
          <p id={`${p.id}-pais`} className="mt-1 truncate text-xs text-texto/80" title={paisDelCodigo(codigo)}>
            {paisDelCodigo(codigo)}
          </p>
        </div>
        <input
          id={p.id}
          type="tel"
          inputMode="tel"
          autoComplete={p.autoComplete}
          placeholder={codigo === CODIGO_PAIS_INICIAL ? "11 2345-6789" : undefined}
          value={numero}
          onChange={(e) => p.onCambio(unirTelefono(codigo, e.target.value))}
          onBlur={p.onSalir}
          aria-invalid={p.error ? true : undefined}
          aria-describedby={descripcion || undefined}
          className={claseInput(Boolean(p.error))}
        />
      </div>
      {p.ayuda && (
        <p id={`${p.id}-ayuda`} className="mt-1 text-sm text-texto/80">
          {p.ayuda}
        </p>
      )}
      <MensajeError id={`${p.id}-error`} mensaje={p.error} />
    </div>
  );
}
