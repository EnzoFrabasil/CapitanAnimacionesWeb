import { z } from "zod";
import { LARGO_MAXIMO } from "@/config/inscripcion";
import { normalizarDni } from "@/lib/dominio/dni";
import { fechaAIso, fechaDesdeIsoONull } from "@/lib/dominio/fechas";
import { normalizarWhatsapp } from "@/lib/dominio/telefono";
import { ETIQUETA_ESTADO, ETIQUETA_MODALIDAD, ETIQUETA_TURNO, formatearFecha, formatearFechaHora, formatearWhatsapp } from "@/lib/formato";
import { generarCsv, parsearCsv, quitarProteccionFormula } from "./formato";

// Exportación e importación del listado de inscriptos (una fila por niño inscripto).

export const COLUMNAS = [
  "id",
  "numero_inscripcion",
  "fecha_alta",
  "estado",
  "nombre",
  "apellido",
  "dni",
  "fecha_nacimiento",
  "edad_al_inscribir",
  "grupo",
  "turno",
  "modalidad",
  "semanas_o_dias",
  "info_adicional",
  "posible_duplicado",
  "contacto_nombre",
  "contacto_apellido",
  "contacto_parentesco",
  "contacto_whatsapp",
  "contacto_email",
] as const;

/** Columnas que se pueden modificar al importar (el resto se ignora). */
export const COLUMNAS_EDITABLES = [
  "estado",
  "nombre",
  "apellido",
  "dni",
  "fecha_nacimiento",
  "grupo",
  "turno",
  "info_adicional",
  "contacto_nombre",
  "contacto_apellido",
  "contacto_parentesco",
  "contacto_whatsapp",
  "contacto_email",
] as const;

type Estado = keyof typeof ETIQUETA_ESTADO;
type Turno = keyof typeof ETIQUETA_TURNO;
type Modalidad = keyof typeof ETIQUETA_MODALIDAD;

// ---------------------------------------------------------------------------
// Exportar

export interface InscriptoExport {
  id: number;
  estado: Estado;
  turno: Turno;
  modalidad: Modalidad;
  edadAlInscribir: number;
  posibleDuplicado: boolean;
  inscripcion: { numero: number; fechaAlta: Date };
  grupoEdad: { nombre: string } | null;
  semanas: { semana: { numero: number } }[];
  dias: { fecha: Date }[];
  nino: {
    nombre: string;
    apellido: string;
    dni: string;
    fechaNacimiento: Date;
    infoAdicional: string | null;
    /** El primero es el contacto principal. */
    responsables: { parentesco: string; responsable: { nombre: string; apellido: string; whatsapp: string; email: string | null } }[];
  };
}

export function filaExport(f: InscriptoExport): (string | number)[] {
  const contacto = f.nino.responsables[0];
  const asistencia =
    f.modalidad === "SEMANAS"
      ? f.semanas
          .map((s) => s.semana.numero)
          .sort((a, b) => a - b)
          .map((n) => `Semana ${n}`)
          .join(", ")
      : f.dias
          .map((d) => fechaAIso(d.fecha))
          .sort()
          .map(formatearFecha)
          .join(", ");
  return [
    f.id,
    f.inscripcion.numero,
    formatearFechaHora(f.inscripcion.fechaAlta),
    ETIQUETA_ESTADO[f.estado],
    f.nino.nombre,
    f.nino.apellido,
    f.nino.dni,
    formatearFecha(fechaAIso(f.nino.fechaNacimiento)),
    f.edadAlInscribir,
    f.grupoEdad?.nombre ?? "",
    ETIQUETA_TURNO[f.turno],
    ETIQUETA_MODALIDAD[f.modalidad],
    asistencia,
    f.nino.infoAdicional ?? "",
    f.posibleDuplicado ? "Sí" : "No",
    contacto?.responsable.nombre ?? "",
    contacto?.responsable.apellido ?? "",
    contacto?.parentesco ?? "",
    contacto?.responsable.whatsapp ?? "",
    contacto?.responsable.email ?? "",
  ];
}

export function generarCsvInscriptos(filas: readonly InscriptoExport[]): string {
  return generarCsv(COLUMNAS, filas.map(filaExport));
}

// ---------------------------------------------------------------------------
// Interpretar valores escritos a mano o reformateados por Excel

const sinTildes = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s_]+/g, " ")
    .trim();

/** Acepta dd/mm/aaaa, d/m/aaaa, dd-mm-aaaa y aaaa-mm-dd. Devuelve aaaa-mm-dd o null. */
export function leerFecha(texto: string): string | null {
  const t = texto.trim();
  const dma = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t);
  const iso = dma ? `${dma[3]}-${dma[2].padStart(2, "0")}-${dma[1].padStart(2, "0")}` : t;
  const fecha = fechaDesdeIsoONull(iso);
  return fecha ? fechaAIso(fecha) : null;
}

export function leerEstado(texto: string): Estado | null {
  const t = sinTildes(texto);
  for (const [codigo, etiqueta] of Object.entries(ETIQUETA_ESTADO)) {
    if (t === sinTildes(etiqueta) || t === sinTildes(codigo)) return codigo as Estado;
  }
  return null;
}

export function leerTurno(texto: string): Turno | null {
  const t = sinTildes(texto);
  if (t === "manana") return "MANANA";
  if (t === "tarde") return "TARDE";
  return null;
}

// ---------------------------------------------------------------------------
// Planificar la importación (sin tocar la base)

export interface EstadoActual {
  id: number;
  ninoId: number;
  temporadaId: number;
  estado: Estado;
  turno: Turno;
  grupoEdadId: number | null;
  nino: { nombre: string; apellido: string; dni: string; fechaNacimiento: string; infoAdicional: string | null };
  contacto: {
    responsableId: number;
    nombre: string;
    apellido: string;
    whatsapp: string;
    email: string | null;
    parentesco: string;
    /** Cantidad de niños vinculados a este contacto. */
    ninosVinculados: number;
  } | null;
}

export interface ContextoImportacion {
  actuales: ReadonlyMap<number, EstadoActual>;
  gruposPorTemporada: ReadonlyMap<number, readonly { id: number; nombre: string }[]>;
  /** Contactos existentes por WhatsApp (para no duplicar uno ajeno). */
  responsablePorWhatsapp: ReadonlyMap<string, number>;
  /** Hoy (aaaa-mm-dd), para validar la fecha de nacimiento. */
  hoy: string;
}

export interface DatosAplicar {
  inscripcionNinoId: number;
  ninoId: number;
  nino: Partial<{ nombre: string; apellido: string; dni: string; fechaNacimiento: string; infoAdicional: string | null }>;
  inscripcion: Partial<{ estado: Estado; turno: Turno; grupoEdadId: number | null }>;
  responsableId: number | null;
  responsable: Partial<{ nombre: string; apellido: string; whatsapp: string; email: string | null }>;
  parentesco: string | null;
}

export interface CambioCampo {
  columna: string;
  anterior: string;
  nuevo: string;
}

export interface FilaConCambios {
  fila: number;
  id: number;
  nino: string;
  campos: CambioCampo[];
  advertencias: string[];
  datos: DatosAplicar;
}

export interface PlanImportacion {
  errorGeneral: string | null;
  filasLeidas: number;
  cambios: FilaConCambios[];
  sinCambios: number;
  errores: { fila: number; id: number | null; mensajes: string[] }[];
  ignoradas: { fila: number; motivo: string }[];
  columnasIgnoradas: string[];
}

export interface ArchivoLeido {
  errorGeneral: string | null;
  columnas: string[];
  filas: { fila: number; valores: Record<string, string> }[];
}

/** Lee el archivo y arma un objeto por fila con las columnas por nombre. */
export function leerArchivo(texto: string): ArchivoLeido {
  const [encabezado, ...datos] = parsearCsv(texto);
  if (!encabezado) return { errorGeneral: "El archivo está vacío.", columnas: [], filas: [] };
  const columnas = encabezado.map((c) => sinTildes(quitarProteccionFormula(c)).replace(/ /g, "_"));
  if (!columnas.includes("id")) {
    return { errorGeneral: 'Falta la columna "id". Usá el archivo descargado con "Descargar CSV".', columnas, filas: [] };
  }
  return {
    errorGeneral: null,
    columnas,
    filas: datos.map((valores, i) => ({
      // Número de fila como lo ve Excel (la 1 es el encabezado).
      fila: i + 2,
      valores: Object.fromEntries(columnas.map((c, j) => [c, quitarProteccionFormula(valores[j] ?? "").trim()])),
    })),
  };
}

/** IDs y WhatsApp (normalizados) que aparecen en el archivo, para buscarlos en la base. */
export function referenciasDelArchivo(archivo: ArchivoLeido): { ids: number[]; whatsapps: string[] } {
  const ids = new Set<number>();
  const whatsapps = new Set<string>();
  for (const { valores } of archivo.filas) {
    const id = Number(valores.id);
    if (Number.isInteger(id) && id > 0) ids.add(id);
    const w = valores.contacto_whatsapp ? normalizarWhatsapp(valores.contacto_whatsapp) : null;
    if (w) whatsapps.add(w);
  }
  return { ids: [...ids], whatsapps: [...whatsapps] };
}

const emailSchema = z.email();
const mostrarFecha = (iso: string) => formatearFecha(iso);
const mostrar = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? "(vacío)" : v);

export function planificarImportacion(archivo: ArchivoLeido, ctx: ContextoImportacion): PlanImportacion {
  const plan: PlanImportacion = {
    errorGeneral: archivo.errorGeneral,
    filasLeidas: archivo.filas.length,
    cambios: [],
    sinCambios: 0,
    errores: [],
    ignoradas: [],
    columnasIgnoradas: archivo.columnas.filter((c) => !(COLUMNAS_EDITABLES as readonly string[]).includes(c) && c !== "id"),
  };
  if (archivo.errorGeneral) return plan;

  const hay = (c: (typeof COLUMNAS_EDITABLES)[number]) => archivo.columnas.includes(c);
  const filaDeId = new Map<number, number>();
  // Cambios ya aceptados por entidad y campo, para detectar filas que se contradicen.
  const aceptados = new Map<string, { valor: string; fila: number }>();

  for (const { fila, valores: v } of archivo.filas) {
    if (!v.id) {
      plan.ignoradas.push({ fila, motivo: "No tiene id (las filas nuevas no se crean)." });
      continue;
    }
    const id = Number(v.id);
    const actual = Number.isInteger(id) ? ctx.actuales.get(id) : undefined;
    if (!actual) {
      plan.ignoradas.push({ fila, motivo: `No existe un inscripto con id ${v.id}.` });
      continue;
    }
    const filaPrevia = filaDeId.get(id);
    if (filaPrevia !== undefined) {
      plan.errores.push({ fila, id, mensajes: [`El id ${id} está repetido (ya aparece en la fila ${filaPrevia}).`] });
      continue;
    }
    filaDeId.set(id, fila);

    const errores: string[] = [];
    const campos: CambioCampo[] = [];
    const advertencias: string[] = [];
    const claves: { clave: string; valor: string }[] = [];
    const datos: DatosAplicar = {
      inscripcionNinoId: id,
      ninoId: actual.ninoId,
      nino: {},
      inscripcion: {},
      responsableId: actual.contacto?.responsableId ?? null,
      responsable: {},
      parentesco: null,
    };
    const registrar = (columna: string, anterior: string, nuevo: string, clave: string | null, valorClave: string) => {
      campos.push({ columna, anterior, nuevo });
      if (clave) claves.push({ clave, valor: valorClave });
    };

    const texto = (col: "nombre" | "apellido", requerido: string) => {
      if (!hay(col)) return;
      const nuevo = v[col];
      if (!nuevo) return errores.push(requerido);
      if (nuevo.length > LARGO_MAXIMO.nombre) return errores.push(`${col}: hasta ${LARGO_MAXIMO.nombre} caracteres.`);
      if (nuevo !== actual.nino[col]) {
        datos.nino[col] = nuevo;
        registrar(col, actual.nino[col], nuevo, `nino:${actual.ninoId}:${col}`, nuevo);
      }
    };
    texto("nombre", "El nombre está vacío.");
    texto("apellido", "El apellido está vacío.");

    if (hay("dni")) {
      const dni = normalizarDni(v.dni);
      if (!dni) errores.push(`DNI inválido: "${v.dni}" (tiene que tener 7 u 8 números).`);
      else if (dni !== actual.nino.dni) {
        datos.nino.dni = dni;
        registrar("dni", actual.nino.dni, dni, `nino:${actual.ninoId}:dni`, dni);
      }
    }

    if (hay("fecha_nacimiento")) {
      const iso = leerFecha(v.fecha_nacimiento);
      if (!iso) errores.push(`Fecha de nacimiento inválida: "${v.fecha_nacimiento}" (usá dd/mm/aaaa).`);
      else if (iso >= ctx.hoy) errores.push("La fecha de nacimiento tiene que ser anterior a hoy.");
      else if (iso !== actual.nino.fechaNacimiento) {
        datos.nino.fechaNacimiento = iso;
        registrar("fecha_nacimiento", mostrarFecha(actual.nino.fechaNacimiento), mostrarFecha(iso), `nino:${actual.ninoId}:fecha`, iso);
      }
    }

    if (hay("info_adicional")) {
      const nuevo = v.info_adicional || null;
      if (nuevo && nuevo.length > LARGO_MAXIMO.infoAdicional) errores.push(`info_adicional: hasta ${LARGO_MAXIMO.infoAdicional} caracteres.`);
      else if (nuevo !== actual.nino.infoAdicional) {
        datos.nino.infoAdicional = nuevo;
        registrar("info_adicional", mostrar(actual.nino.infoAdicional), mostrar(nuevo), `nino:${actual.ninoId}:info`, nuevo ?? "");
      }
    }

    if (hay("estado")) {
      const estado = leerEstado(v.estado);
      if (!estado) errores.push(`Estado inválido: "${v.estado}" (En espera, Confirmado o Cancelado).`);
      else if (estado !== actual.estado) {
        datos.inscripcion.estado = estado;
        registrar("estado", ETIQUETA_ESTADO[actual.estado], ETIQUETA_ESTADO[estado], null, "");
      }
    }

    if (hay("turno")) {
      const turno = leerTurno(v.turno);
      if (!turno) errores.push(`Turno inválido: "${v.turno}" (Mañana o Tarde).`);
      else if (turno !== actual.turno) {
        datos.inscripcion.turno = turno;
        registrar("turno", ETIQUETA_TURNO[actual.turno], ETIQUETA_TURNO[turno], null, "");
      }
    }

    if (hay("grupo")) {
      const grupos = ctx.gruposPorTemporada.get(actual.temporadaId) ?? [];
      const nombreActual = grupos.find((g) => g.id === actual.grupoEdadId)?.nombre ?? "Sin grupo";
      const buscado = sinTildes(v.grupo);
      const grupo = buscado === "" || buscado === "sin grupo" ? null : grupos.find((g) => sinTildes(g.nombre) === buscado);
      if (grupo === undefined) errores.push(`El grupo "${v.grupo}" no existe en la temporada.`);
      else if ((grupo?.id ?? null) !== actual.grupoEdadId) {
        datos.inscripcion.grupoEdadId = grupo?.id ?? null;
        registrar("grupo", nombreActual, grupo?.nombre ?? "Sin grupo", null, "");
      }
    }

    // Contacto principal
    const columnasContacto = ["contacto_nombre", "contacto_apellido", "contacto_parentesco", "contacto_whatsapp", "contacto_email"] as const;
    const c = actual.contacto;
    if (!c) {
      if (columnasContacto.some((col) => hay(col) && v[col])) errores.push("Este niño/a no tiene contacto principal; no se pueden cargar sus datos desde el CSV.");
    } else {
      const responsableCambia = () => {
        if (c.ninosVinculados > 1 && !advertencias.length) {
          advertencias.push(`El contacto ${c.nombre} ${c.apellido} está vinculado a ${c.ninosVinculados} niños: el cambio afecta a todos.`);
        }
      };
      for (const [col, campo] of [
        ["contacto_nombre", "nombre"],
        ["contacto_apellido", "apellido"],
      ] as const) {
        if (!hay(col)) continue;
        const nuevo = v[col];
        if (!nuevo) errores.push(`${col} está vacío.`);
        else if (nuevo.length > LARGO_MAXIMO.nombre) errores.push(`${col}: hasta ${LARGO_MAXIMO.nombre} caracteres.`);
        else if (nuevo !== c[campo]) {
          datos.responsable[campo] = nuevo;
          registrar(col, c[campo], nuevo, `resp:${c.responsableId}:${campo}`, nuevo);
          responsableCambia();
        }
      }
      if (hay("contacto_parentesco")) {
        const nuevo = v.contacto_parentesco;
        if (!nuevo) errores.push("contacto_parentesco está vacío.");
        else if (nuevo.length > LARGO_MAXIMO.parentesco) errores.push(`contacto_parentesco: hasta ${LARGO_MAXIMO.parentesco} caracteres.`);
        else if (nuevo !== c.parentesco) {
          datos.parentesco = nuevo;
          registrar("contacto_parentesco", c.parentesco, nuevo, null, "");
        }
      }
      if (hay("contacto_whatsapp")) {
        const nuevo = normalizarWhatsapp(v.contacto_whatsapp);
        const dueno = nuevo ? ctx.responsablePorWhatsapp.get(nuevo) : undefined;
        if (!nuevo) errores.push(`WhatsApp inválido: "${v.contacto_whatsapp}".`);
        else if (nuevo !== c.whatsapp && dueno !== undefined && dueno !== c.responsableId) {
          errores.push(`El WhatsApp ${formatearWhatsapp(nuevo)} ya pertenece a otro contacto.`);
        } else if (nuevo !== c.whatsapp) {
          datos.responsable.whatsapp = nuevo;
          registrar("contacto_whatsapp", formatearWhatsapp(c.whatsapp), formatearWhatsapp(nuevo), `resp:${c.responsableId}:whatsapp`, nuevo);
          // Dos contactos distintos no pueden quedar con el mismo WhatsApp.
          claves.push({ clave: `whatsapp:${nuevo}`, valor: String(c.responsableId) });
          responsableCambia();
        }
      }
      if (hay("contacto_email")) {
        const nuevo = v.contacto_email || null;
        if (nuevo && (!emailSchema.safeParse(nuevo).success || nuevo.length > LARGO_MAXIMO.email)) errores.push(`Email inválido: "${nuevo}".`);
        else if (nuevo !== c.email) {
          datos.responsable.email = nuevo;
          registrar("contacto_email", mostrar(c.email), mostrar(nuevo), `resp:${c.responsableId}:email`, nuevo ?? "");
          responsableCambia();
        }
      }
    }

    // Otra fila ya cambió el mismo dato (del mismo niño o contacto) a un valor distinto.
    if (errores.length === 0) {
      for (const { clave, valor } of claves) {
        const previo = aceptados.get(clave);
        if (previo && previo.valor !== valor) {
          errores.push(
            clave.startsWith("whatsapp:")
              ? `Otra fila (${previo.fila}) asigna el mismo WhatsApp a otro contacto.`
              : `La fila ${previo.fila} cambia el mismo dato a otro valor (es el mismo niño/a o contacto compartido).`,
          );
        }
      }
    }

    if (errores.length > 0) {
      plan.errores.push({ fila, id, mensajes: errores });
    } else if (campos.length === 0) {
      plan.sinCambios++;
    } else {
      for (const { clave, valor } of claves) aceptados.set(clave, { valor, fila });
      plan.cambios.push({ fila, id, nino: `${actual.nino.nombre} ${actual.nino.apellido}`, campos, advertencias, datos });
    }
  }
  return plan;
}
