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
  "mensajes.editar": { nombre: "Editar los mensajes de WhatsApp y los datos de pago", grupo: "Panel" },
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

export interface ItemMenu {
  href: string;
  nombre: string;
  /** Una línea que explica para qué sirve (se muestra en el menú). */
  descripcion: string;
  permiso: Permiso;
}

/** Menú del panel agrupado por para qué sirve cada cosa. Cada persona ve solo lo que su rol permite. */
export const MENU: readonly { grupo: string; items: readonly ItemMenu[] }[] = [
  {
    grupo: "Inscriptos",
    items: [
      { href: "/admin", nombre: "Inscriptos", descripcion: "Lista, fichas, contactos y alergias", permiso: "inscriptos.ver" },
    ],
  },
  {
    grupo: "La colonia",
    items: [
      { href: "/admin/colonia/fechas", nombre: "Fechas y horarios", descripcion: "Quincenas o semanas que se ofrecen", permiso: "configuracion.editar" },
      { href: "/admin/colonia/precios", nombre: "Precios y cupo", descripcion: "Cuánto se cobra y cuántos lugares hay", permiso: "configuracion.editar" },
      { href: "/admin/colonia/grupos", nombre: "Grupos y edades", descripcion: "Edades permitidas y grupos por edad", permiso: "configuracion.editar" },
      { href: "/admin/colonia/temporadas", nombre: "Temporadas", descripcion: "Crear una temporada nueva o renombrarla", permiso: "configuracion.editar" },
    ],
  },
  {
    grupo: "Sitio web",
    items: [
      { href: "/admin/inicio", nombre: "Página de inicio", descripcion: "Textos, fotos y datos que ven las familias", permiso: "contenido.editar" },
      { href: "/admin/inicio?pestana=inscripcion", nombre: "Textos del formulario", descripcion: "Lo que dice cada paso de la inscripción", permiso: "contenido.editar" },
      { href: "/admin/mensajes", nombre: "Mensajes de WhatsApp", descripcion: "Textos listos para escribirle a las familias", permiso: "mensajes.editar" },
    ],
  },
  {
    grupo: "Administración",
    items: [
      { href: "/admin/analiticas", nombre: "Analíticas", descripcion: "Números de la temporada y dinero", permiso: "analiticas.ver" },
      { href: "/admin/usuarios", nombre: "Usuarios", descripcion: "Quién entra al panel y qué puede hacer", permiso: "usuarios.gestionar" },
      { href: "/admin/registro", nombre: "Registro", descripcion: "Quién cambió qué y cuándo", permiso: "registro.ver" },
      { href: "/admin/backups", nombre: "Backups", descripcion: "Descargar una copia de seguridad", permiso: "backups.descargar" },
    ],
  },
];

/** Todas las secciones en orden (para "a dónde puede ir" y el destino al entrar). */
export const SECCIONES: readonly ItemMenu[] = MENU.flatMap((g) => g.items);

/** El menú con solo lo que puede ver (sin grupos vacíos). */
export function menuPara(permisos: ReadonlySet<Permiso>) {
  return MENU.map((g) => ({ grupo: g.grupo, items: g.items.filter((i) => permisos.has(i.permiso)) })).filter((g) => g.items.length > 0);
}

/** Primera sección a la que puede entrar (para mandarlo ahí al iniciar sesión). */
export function seccionInicial(permisos: ReadonlySet<Permiso>): string {
  return SECCIONES.find((s) => permisos.has(s.permiso))?.href ?? "/admin/cuenta";
}
