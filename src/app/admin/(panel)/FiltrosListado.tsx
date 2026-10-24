"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { claseBoton, claseEtiqueta, claseInput } from "@/components/admin/estilos";
import { filtrosAQuery, type Filtros } from "@/lib/admin/filtros";

interface Props {
  filtros: Filtros;
  temporadaId: number;
  temporadas: { id: number; nombre: string }[];
  grupos: { id: number; nombre: string }[];
  semanas: { id: number; numero: number }[];
  /** "Semana", "Quincena" */
  nombrePeriodo: string;
}

export function FiltrosListado({ filtros, temporadaId, temporadas, grupos, semanas, nombrePeriodo }: Props) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState(filtros.q ?? "");

  const aplicar = (cambios: Partial<Filtros>) => {
    const query = filtrosAQuery({ ...filtros, temporada: temporadaId, ...cambios });
    router.push(`/admin${query ? `?${query}` : ""}`);
  };

  const selector = (
    id: keyof Filtros,
    etiqueta: string,
    valor: string | number | undefined,
    opciones: { valor: string | number; texto: string }[],
    alCambiar: (v: string) => void,
  ) => (
    <div>
      <label htmlFor={`filtro-${id}`} className={claseEtiqueta}>
        {etiqueta}
      </label>
      <select id={`filtro-${id}`} value={valor ?? ""} onChange={(e) => alCambiar(e.target.value)} className={claseInput}>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {selector(
        "temporada",
        "Temporada",
        temporadaId,
        temporadas.map((t) => ({ valor: t.id, texto: t.nombre })),
        // Al cambiar de temporada, el grupo y la semana dejan de tener sentido.
        (v) => aplicar({ temporada: Number(v), grupo: undefined, semana: undefined }),
      )}
      {selector(
        "grupo",
        "Grupo",
        filtros.grupo,
        [{ valor: "", texto: "Todos" }, ...grupos.map((g) => ({ valor: g.id, texto: g.nombre })), { valor: "sin", texto: "Sin grupo" }],
        (v) => aplicar({ grupo: v === "" ? undefined : v === "sin" ? "sin" : Number(v) }),
      )}
      {selector(
        "turno",
        "Turno",
        filtros.turno,
        [
          { valor: "", texto: "Todos" },
          { valor: "MANANA", texto: "Mañana" },
          { valor: "TARDE", texto: "Tarde" },
        ],
        (v) => aplicar({ turno: (v || undefined) as Filtros["turno"] }),
      )}
      {selector(
        "semana",
        nombrePeriodo,
        filtros.semana,
        [{ valor: "", texto: "Todas" }, ...semanas.map((s) => ({ valor: s.id, texto: `${nombrePeriodo} ${s.numero}` }))],
        (v) => aplicar({ semana: v ? Number(v) : undefined }),
      )}
      {selector(
        "estado",
        "Estado",
        filtros.estado,
        [
          { valor: "", texto: "Todos" },
          { valor: "EN_ESPERA", texto: "En espera" },
          { valor: "CONFIRMADO", texto: "Confirmado" },
          { valor: "CANCELADO", texto: "Cancelado" },
        ],
        (v) => aplicar({ estado: (v || undefined) as Filtros["estado"] }),
      )}
      <div className="flex items-end">
        <label className="flex cursor-pointer items-center gap-2 py-2 text-sm font-medium text-marino">
          <input
            type="checkbox"
            checked={filtros.duplicados === "1"}
            onChange={(e) => aplicar({ duplicados: e.target.checked ? "1" : undefined })}
            className="size-4 accent-marino"
          />
          Posibles duplicados
        </label>
      </div>
      <form
        role="search"
        className="sm:col-span-3 lg:col-span-6"
        onSubmit={(e) => {
          e.preventDefault();
          aplicar({ q: busqueda.trim() || undefined });
        }}
      >
        <label htmlFor="filtro-q" className={claseEtiqueta}>
          Buscar
        </label>
        <div className="flex max-w-xl gap-2">
          <input
            id="filtro-q"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre, apellido o DNI"
            className={claseInput}
          />
          <button type="submit" className={claseBoton.secundario}>
            Buscar
          </button>
        </div>
      </form>
    </div>
  );
}
