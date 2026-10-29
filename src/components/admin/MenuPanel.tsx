"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ItemMenu } from "@/lib/auth/permisos";

type Grupo = { grupo: string; items: ItemMenu[] };

/** ¿El link es la página actual? /admin/inicio distingue la pestaña por ?pestana. */
function useEsActual() {
  const ruta = usePathname();
  const pestana = useSearchParams().get("pestana");
  return (href: string) => {
    const [camino, query] = href.split("?");
    if (camino !== ruta && !(camino !== "/admin" && ruta.startsWith(`${camino}/`))) return false;
    return (new URLSearchParams(query).get("pestana") ?? null) === (camino === "/admin/inicio" ? pestana : null);
  };
}

function Item({ item, actual, alElegir }: { item: ItemMenu; actual: boolean; alElegir: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={alElegir}
      aria-current={actual ? "page" : undefined}
      className={`block rounded-lg px-3 py-2 transition ${actual ? "bg-marino/10" : "hover:bg-crema"}`}
    >
      <span className="block text-sm font-semibold text-marino">{item.nombre}</span>
      <span className="block text-xs text-texto/80">{item.descripcion}</span>
    </Link>
  );
}

/**
 * Menú del panel: un botón por grupo que abre sus secciones (en el celular, todo
 * dentro de un solo botón "Menú"). Un grupo con una sola sección es un link directo.
 */
export function MenuPanel({ grupos }: { grupos: Grupo[] }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [movil, setMovil] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const esActual = useEsActual();
  const ruta = usePathname();

  // Se cierra al navegar (también con atrás/adelante), al tocar afuera o con Escape.
  const [rutaAnterior, setRutaAnterior] = useState(ruta);
  if (ruta !== rutaAnterior) {
    setRutaAnterior(ruta);
    setAbierto(null);
    setMovil(false);
  }
  useEffect(() => {
    const fuera = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) {
        setAbierto(null);
        setMovil(false);
      }
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(null);
        setMovil(false);
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, []);

  const cerrar = () => {
    setAbierto(null);
    setMovil(false);
  };

  return (
    <div ref={raiz} className="relative flex-1">
      {/* Escritorio */}
      <ul className="hidden items-center gap-1 md:flex">
        {grupos.map((g) => {
          const activo = g.items.some((i) => esActual(i.href));
          const clase = `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            activo ? "bg-white/15 text-white" : "text-white/90 hover:bg-white/10 hover:text-white"
          }`;
          if (g.items.length === 1) {
            return (
              <li key={g.grupo}>
                <Link href={g.items[0].href} className={clase} aria-current={activo ? "page" : undefined}>
                  {g.items[0].nombre}
                </Link>
              </li>
            );
          }
          const id = `menu-${g.grupo.toLowerCase().replace(/\W+/g, "-")}`;
          return (
            <li key={g.grupo} className="relative">
              <button
                type="button"
                aria-expanded={abierto === g.grupo}
                aria-controls={id}
                onClick={() => setAbierto((a) => (a === g.grupo ? null : g.grupo))}
                className={`${clase} flex items-center gap-1`}
              >
                {g.grupo}
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={`size-4 transition-transform ${abierto === g.grupo ? "rotate-180" : ""}`}>
                  <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
                </svg>
              </button>
              {abierto === g.grupo && (
                <div id={id} className="absolute top-full left-0 z-50 mt-2 w-72 rounded-xl border border-marino/10 bg-white p-2 text-texto shadow-lg">
                  {g.items.map((i) => (
                    <Item key={i.href} item={i} actual={esActual(i.href)} alElegir={cerrar} />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Celular */}
      <div className="md:hidden">
        <button
          type="button"
          aria-expanded={movil}
          aria-controls="menu-movil"
          onClick={() => setMovil((m) => !m)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="size-5">
            <path d={movil ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} />
          </svg>
          Menú
        </button>
        {movil && (
          <div id="menu-movil" className="fixed inset-x-4 top-14 z-50 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-xl border border-marino/10 bg-white p-2 text-texto shadow-lg">
            {grupos.map((g) => (
              <div key={g.grupo} className="mb-1">
                <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-texto/60 uppercase">{g.grupo}</p>
                {g.items.map((i) => (
                  <Item key={i.href} item={i} actual={esActual(i.href)} alElegir={cerrar} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
