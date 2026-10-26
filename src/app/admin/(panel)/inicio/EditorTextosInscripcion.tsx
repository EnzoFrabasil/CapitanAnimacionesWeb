"use client";

import { CampoAjuste } from "@/components/inicio/controles";
import { useEdicion } from "@/components/inicio/editables";
import type { TextosInscripcion } from "@/lib/contenido/esquema";

// Pestaña del editor con los textos del formulario de inscripción, agrupados
// en el orden en que los ve la familia.

type Campo = { clave: keyof TextosInscripcion; etiqueta: string; multilinea?: boolean; ayuda?: string };

const GRUPOS: { titulo: string; descripcion: string; campos: Campo[] }[] = [
  {
    titulo: "Encabezado",
    descripcion: "Arriba del formulario, en todos los pasos.",
    campos: [
      { clave: "titulo", etiqueta: "Título" },
      { clave: "pasoContactos", etiqueta: "Nombre del paso 1" },
      { clave: "pasoNinos", etiqueta: "Nombre del paso 2" },
      { clave: "pasoRevision", etiqueta: "Nombre del paso 3" },
    ],
  },
  {
    titulo: "Paso 1: contactos",
    descripcion: "Texto que se ve antes de cargar los contactos.",
    campos: [{ clave: "introContactos", etiqueta: "Introducción", multilinea: true }],
  },
  {
    titulo: "Paso 2: niños",
    descripcion: "Texto que se ve antes de cargar a los chicos.",
    campos: [
      { clave: "introNinos", etiqueta: "Introducción", multilinea: true },
      {
        clave: "ayudaInfoAdicional",
        etiqueta: "Ayuda debajo de “Información adicional”",
        ayuda: "Conviene mencionar alergias y medicación.",
      },
    ],
  },
  {
    titulo: "Paso 3: revisión",
    descripcion: "Antes de enviar.",
    campos: [
      { clave: "introRevision", etiqueta: "Introducción", multilinea: true },
      {
        clave: "textoAceptacion",
        etiqueta: "Texto de la casilla de aceptación",
        multilinea: true,
        ayuda: "Va seguido del enlace “Ver más” a la página de privacidad. Si cambia el sentido, avisá a quien revisa lo legal.",
      },
      { clave: "botonEnviar", etiqueta: "Texto del botón de envío" },
    ],
  },
  {
    titulo: "Paso 3: total",
    descripcion: "Debajo de la revisión. Solo se muestra si hay precios mayores a $0 (en preinscripción no aparece).",
    campos: [
      { clave: "totalTitulo", etiqueta: "Título del total" },
      { clave: "totalNota", etiqueta: "Nota debajo del total", multilinea: true },
      { clave: "notaDiasSueltos", etiqueta: "Nota si hay días sueltos sin precio" },
      { clave: "descuentoTitulo", etiqueta: "Título del aviso de descuento por hermanos" },
      {
        clave: "descuentoTexto",
        etiqueta: "Texto del aviso de descuento",
        ayuda: "{porcentaje} se reemplaza por el porcentaje de descuento configurado.",
      },
      { clave: "notaHermano", etiqueta: "Nota para quien inscribe a un solo chico", multilinea: true },
    ],
  },
  {
    titulo: "Al terminar",
    descripcion: "Pantalla que se ve después de enviar (debajo va el número de inscripción).",
    campos: [
      { clave: "exitoTitulo", etiqueta: "Título" },
      { clave: "exitoTexto", etiqueta: "Texto", multilinea: true },
    ],
  },
  {
    titulo: "Inscripciones cerradas",
    descripcion: "Se ve cuando ninguna temporada tiene la inscripción abierta.",
    campos: [
      { clave: "cerradasTitulo", etiqueta: "Título" },
      { clave: "cerradasTexto", etiqueta: "Texto", multilinea: true },
    ],
  },
];

export function EditorTextosInscripcion({ textos }: { textos: TextosInscripcion }) {
  const edicion = useEdicion();
  if (!edicion) return null;
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <p>
        Estos textos se ven en el formulario de{" "}
        <a href="/inscripcion" target="_blank" rel="noopener" className="font-semibold text-marino underline">
          inscripción
        </a>
        . Se publican junto con la página de inicio, con el mismo botón “Publicar cambios”.
      </p>
      {GRUPOS.map((g) => (
        <section key={g.titulo} className="space-y-4 rounded-3xl border-2 border-marino/15 bg-white p-5">
          <div>
            <h2 className="font-titulo text-xl font-semibold text-marino">{g.titulo}</h2>
            <p className="text-sm text-texto/80">{g.descripcion}</p>
          </div>
          {g.campos.map((c) => (
            <CampoAjuste
              key={c.clave}
              edicion={edicion}
              ruta={["inscripcion", c.clave]}
              etiqueta={c.etiqueta}
              valor={textos[c.clave]}
              multilinea={c.multilinea}
              ayuda={c.ayuda}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
