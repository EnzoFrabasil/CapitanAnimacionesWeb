// Permisos del panel. Cada página y acción pide uno; los roles (tabla Rol)
// agrupan permisos y se editan desde Usuarios → Roles. Para sumar un permiso
// nuevo alcanza con agregarlo acá y pedirlo donde corresponda: el rol "total"
// lo tiene automáticamente y a los demás se les marca desde el panel.

export const PERMISOS = {
  "inscriptos.ver": { nombre: "Ver inscriptos", grupo: "Inscriptos" },
  "inscriptos.editar": { nombre: "Editar inscriptos, contactos y familias", grupo: "Inscriptos" },
  "inscriptos.borrar": { nombre: "Eliminar inscriptos", grupo: "Inscriptos" },
  "inscriptos.exportar": { nombre: "Descargar el CSV de inscriptos", grupo: "Inscriptos" },
  "inscriptos.importar": { nombre: "Importar cambios desde un CSV", grupo: "Inscriptos" },
  "analiticas.ver": { nombre: "Ver analíticas", grupo: "Panel" },
  "configuracion.editar": { nombre: "Configurar temporadas, opciones, precios y grupos", grupo: "Panel" },
  "contenido.editar": { nombre: "Editar la página de inicio y los textos", grupo: "Panel" },
  "backups.descargar": { nombre: "Descargar backups de la base", grupo: "Seguridad" },
  "registro.ver": { nombre: "Ver el registro de cambios", grupo: "Seguridad" },
  "usuarios.gestionar": { nombre: "Gestionar usuarios, roles y permisos", grupo: "Seguridad" },
} as const;

export type Permiso = keyof typeof PERMISOS;

export const LISTA_PERMISOS = Object.keys(PERMISOS) as Permiso[];

export const esPermiso = (valor: string): valor is Permiso => valor in PERMISOS;

/** Permisos efectivos de un rol: todos si es total, si no los que tiene guardados (ignora los que ya no existen). */
export function permisosDeRol(rol: { esTotal: boolean; permisos: readonly string[] }): Set<Permiso> {
  return new Set(rol.esTotal ? LISTA_PERMISOS : rol.permisos.filter(esPermiso));
}

/** Secciones del menú, en orden, con el permiso que piden. */
export const SECCIONES = [
  { href: "/admin", nombre: "Inscriptos", permiso: "inscriptos.ver" },
  { href: "/admin/analiticas", nombre: "Analíticas", permiso: "analiticas.ver" },
  { href: "/admin/configuracion", nombre: "Configuración", permiso: "configuracion.editar" },
  { href: "/admin/inicio", nombre: "Editar página de inicio", permiso: "contenido.editar" },
  { href: "/admin/usuarios", nombre: "Usuarios", permiso: "usuarios.gestionar" },
  { href: "/admin/registro", nombre: "Registro", permiso: "registro.ver" },
] as const satisfies readonly { href: string; nombre: string; permiso: Permiso }[];

/** Primera sección a la que puede entrar (para mandarlo ahí al iniciar sesión). */
export function seccionInicial(permisos: ReadonlySet<Permiso>): string {
  return SECCIONES.find((s) => permisos.has(s.permiso))?.href ?? "/admin/cuenta";
}
