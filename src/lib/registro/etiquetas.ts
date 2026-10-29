// Nombres legibles de las acciones del registro, agrupadas para el filtro.

export const ACCIONES_REGISTRO: Record<string, { texto: string; grupo: string }> = {
  "login.ok": { texto: "Inició sesión", grupo: "Ingresos" },
  "login.fallido": { texto: "Intento de ingreso fallido", grupo: "Ingresos" },
  "login.bloqueado": { texto: "Ingreso frenado por muchos intentos", grupo: "Ingresos" },
  logout: { texto: "Cerró sesión", grupo: "Ingresos" },
  "inscripto.editar": { texto: "Editó un inscripto", grupo: "Inscriptos" },
  "inscripto.eliminar": { texto: "Eliminó inscriptos", grupo: "Inscriptos" },
  "nino.editar": { texto: "Editó los datos de un niño/a", grupo: "Inscriptos" },
  "inscripcion.editar": { texto: "Editó una inscripción", grupo: "Inscriptos" },
  "contacto.editar": { texto: "Editó un contacto", grupo: "Inscriptos" },
  "contacto.agregar": { texto: "Agregó un contacto", grupo: "Inscriptos" },
  "contacto.quitar": { texto: "Quitó un contacto", grupo: "Inscriptos" },
  "contacto.principal": { texto: "Cambió el contacto principal", grupo: "Inscriptos" },
  "familia.mover": { texto: "Movió un niño/a de familia", grupo: "Inscriptos" },
  "familia.unir": { texto: "Unió familias", grupo: "Inscriptos" },
  "familia.descuento": { texto: "Cambió el descuento por hermanos", grupo: "Inscriptos" },
  "familia.contactada": { texto: "Marcó una familia como contactada", grupo: "Inscriptos" },
  "familia.sinContactar": { texto: "Quitó la marca de contactada", grupo: "Inscriptos" },
  "grupos.asignar": { texto: "Asignó grupos a niños sin grupo", grupo: "Inscriptos" },
  "csv.importar": { texto: "Importó cambios desde un CSV", grupo: "Inscriptos" },
  "csv.descargar": { texto: "Descargó el CSV de inscriptos", grupo: "Descargas" },
  "backup.descargar": { texto: "Descargó un backup", grupo: "Descargas" },
  "temporada.crear": { texto: "Creó una temporada", grupo: "Configuración" },
  "temporada.editar": { texto: "Editó una temporada", grupo: "Configuración" },
  "inscripcion.abrir": { texto: "Abrió la inscripción", grupo: "Configuración" },
  "inscripcion.cerrar": { texto: "Cerró la inscripción", grupo: "Configuración" },
  "opcion.crear": { texto: "Creó una opción de inscripción", grupo: "Configuración" },
  "opcion.editar": { texto: "Editó una opción de inscripción", grupo: "Configuración" },
  "opcion.eliminar": { texto: "Eliminó una opción de inscripción", grupo: "Configuración" },
  "precios.editar": { texto: "Cambió precios o descuentos", grupo: "Configuración" },
  "grupos.editar": { texto: "Editó los grupos de edad", grupo: "Configuración" },
  "contenido.publicar": { texto: "Publicó la página de inicio", grupo: "Configuración" },
  "mensajes.editar": { texto: "Editó los mensajes de WhatsApp", grupo: "Configuración" },
  "usuario.crear": { texto: "Creó un usuario", grupo: "Usuarios" },
  "usuario.editar": { texto: "Editó un usuario", grupo: "Usuarios" },
  "usuario.rol": { texto: "Cambió el rol de un usuario", grupo: "Usuarios" },
  "usuario.activar": { texto: "Activó un usuario", grupo: "Usuarios" },
  "usuario.desactivar": { texto: "Desactivó un usuario", grupo: "Usuarios" },
  "usuario.password": { texto: "Cambió la contraseña de un usuario", grupo: "Usuarios" },
  "cuenta.password": { texto: "Cambió su propia contraseña", grupo: "Usuarios" },
  "rol.crear": { texto: "Creó un rol", grupo: "Usuarios" },
  "rol.permisos": { texto: "Cambió los permisos de un rol", grupo: "Usuarios" },
  "rol.eliminar": { texto: "Eliminó un rol", grupo: "Usuarios" },
};

export const textoAccion = (accion: string) => ACCIONES_REGISTRO[accion]?.texto ?? accion;

export const GRUPOS_REGISTRO = [...new Set(Object.values(ACCIONES_REGISTRO).map((a) => a.grupo))];

/** Acciones de un grupo (para filtrar). */
export const accionesDelGrupo = (grupo: string) =>
  Object.entries(ACCIONES_REGISTRO)
    .filter(([, a]) => a.grupo === grupo)
    .map(([accion]) => accion);
