# Proyecto: sistema de inscripción para la colonia de Capitán Animaciones (versión beta)

Necesito que construyas desde cero una aplicación web para inscribir niños a una colonia de vacaciones en Argentina. Esta beta solo registra inscripciones en una **lista de espera**. NO hay pagos todavía, pero el diseño tiene que permitir agregarlos después sin modificar las tablas existentes.

Trabajá por etapas (ver "Plan de trabajo" al final). Al terminar cada etapa, mostrame qué hiciste y verificá que el proyecto compile. Si algo de este documento es ambiguo, preguntame antes de decidir.

## Repositorio
Este proyecto ya está clonado desde https://github.com/EnzoFrabasil/CapitanAnimacionesWeb (repo vacío, rama `main`). Este archivo (`PROMPT.md`) queda en el repo como documento de requisitos.
- Commiteá al terminar cada etapa del plan, con mensajes claros en español.
- No hagas push sin preguntarme primero.
- Verificá antes de cada commit que `.env` y cualquier secreto estén en `.gitignore`.

## Stack (obligatorio)
- Next.js (última versión estable, App Router) + TypeScript
- Tailwind CSS
- PostgreSQL en Neon + Prisma (con `DATABASE_URL` pooled y `DIRECT_URL` para migraciones)
- Zod para validar (el mismo esquema en cliente y servidor)
- libphonenumber-js para normalizar teléfonos
- Deploy en Vercel (dirección `*.vercel.app`, sin dominio propio)
- Todo el texto de la interfaz en español rioplatense ("Inscribite", "tu hijo/a").

## Modelo de datos (Prisma)

- **Familia**: id, createdAt. Agrupa hermanos (para el futuro descuento por hermanos).
- **Nino**: id, familiaId, nombre, apellido, dni (string, solo dígitos, **NO único**), fechaNacimiento (date), infoAdicional (text, opcional: alergias, medicación, etc.), createdAt.
- **Responsable**: id, nombre, apellido, whatsapp (string **único**, formato E.164 `+549...`), whatsappAlt (opcional), email (opcional), dni (opcional, existe en la base pero NO se pide en el formulario por ahora), createdAt.
- **NinoResponsable**: ninoId, responsableId, parentesco (string), esPrincipal (bool), orden (int). PK compuesta. Un niño tiene como mínimo 1 responsable. Un responsable puede estar vinculado a varios niños.
- **Temporada**: id, nombre, anio, inscripcionAbierta (bool), createdAt.
- **Semana**: id, temporadaId, numero, fechaInicio, fechaFin. La cantidad de semanas por temporada es libre (hoy son 2, pero podría haber más).
- **GrupoEdad**: id, temporadaId, nombre, edadMin, edadMax (ambos inclusive).
- **Inscripcion**: id, numero (correlativo visible para humanos), temporadaId, familiaId, responsablePrincipalId, fechaAlta. Representa un formulario enviado (puede incluir de 1 a 10 niños).
- **InscripcionNino**: id, inscripcionId, ninoId, grupoEdadId (**nullable** = "sin grupo"), edadAlInscribir (int), turno (enum MANANA | TARDE), modalidad (enum SEMANAS | POR_DIA), estado (enum EN_ESPERA | CONFIRMADO | CANCELADO, por defecto EN_ESPERA), posibleDuplicado (bool), notasAdmin (text opcional).
- **InscripcionSemana**: inscripcionNinoId, semanaId (PK compuesta). Se usa si la modalidad es SEMANAS ("todas las semanas" = una fila por cada semana).
- **InscripcionDia**: inscripcionNinoId, fecha (PK compuesta). Se usa si la modalidad es POR_DIA.

### A futuro (NO implementar, solo no bloquearlo)
Se van a agregar: `Pase` (fechaInicio/fechaFin, vinculado a InscripcionNino, que se genera al confirmar), `Pago` (vinculado a Familia, con subtotal, descuento y total), `Descuento` (reglas, por ejemplo por hermanos), `Comprobante` (vinculado a Pago, con estado de validación) y `Tarifa` (por temporada: diaria, semanal o mensual). Las tablas actuales solo van a recibir relaciones nuevas.

## Reglas de negocio
1. **Edad**: se calcula en el servidor al momento de inscribir y se guarda en `edadAlInscribir`. No se recalcula automáticamente. El grupo se asigna buscando el GrupoEdad de la temporada donde `edadMin <= edad <= edadMax`. Si no hay ninguno, queda "sin grupo" (null) para que se asigne a mano.
2. **Grupos de edad editables** desde el panel con validaciones: edadMin <= edadMax, enteros >= 0, sin superposición de rangos dentro de la misma temporada. Editar los grupos NO reasigna a los niños ya inscriptos. Agregá un botón "Asignar grupo a los niños sin grupo" que intente asignar solo a los que tienen el grupo en null.
3. **WhatsApp**: el usuario lo escribe como quiera ("11 2345-6789", "011 15 2345 6789", "+54 9 11..."). Se normaliza a E.164 argentino móvil (`+549...`) y se rechaza si no es válido. Todo es Argentina: no preguntar el país.
4. **Responsable con WhatsApp ya existente**: se reutiliza el registro existente **sin modificar sus datos** (para que nadie pueda pisar datos ajenos), y se vincula a los niños nuevos. Si ese responsable ya tiene niños en una Familia, los niños nuevos se agregan a esa Familia (así quedan enlazados los hermanos de inscripciones distintas).
5. **DNI duplicado**: si ya existe un niño con ese DNI inscripto en la misma temporada, la inscripción se acepta igual, se crea el registro y se marca `posibleDuplicado = true`. **La familia NO recibe ningún aviso**: la respuesta pública es idéntica, para no revelar qué DNIs existen. Solo se ve en el panel.
6. **DNI**: se aceptan puntos y espacios, se guardan solo los dígitos. Debe tener 7 u 8 dígitos.
7. **Fecha de nacimiento**: debe ser una fecha pasada, con una edad razonable (entre 2 y 17 años; dejalo como constante configurable).
8. **Por día**: solo se pueden elegir días de lunes a viernes dentro de las semanas de la temporada. Mínimo 1 día.
9. **Semanas**: mínimo 1 semana. Ofrecer el atajo "Todas las semanas".
10. **Límites**: entre 1 y 10 niños por inscripción, y mínimo 1 responsable por inscripción (sin máximo).
11. Todos los responsables cargados en el formulario se vinculan a todos los niños de esa inscripción. El primero es el principal. El parentesco se carga una vez por responsable (por ejemplo "madre") y se aplica a todos los niños.
12. Si `inscripcionAbierta` es false, el formulario muestra "Las inscripciones están cerradas" y la API rechaza los envíos.
13. Las inscripciones se guardan en una única transacción: si algo falla, no se guarda nada.

## Páginas públicas
### Inicio (`/`)
- Banner principal con el nombre de la colonia y un botón grande **"Inscribite"** que lleva a `/inscripcion`.
- Debajo: secciones de información con imágenes (placeholders), ubicación con mapa (iframe de Google Maps generado a partir de la dirección), preguntas frecuentes (acordeón), links a redes sociales y un botón flotante de WhatsApp.
- Todo el contenido editable (nombre, textos, dirección, WhatsApp de la colonia, redes, preguntas frecuentes, rutas de imágenes) tiene que estar centralizado en `src/config/sitio.ts`, con valores de ejemplo claramente marcados como `TODO`.

### Inscripción (`/inscripcion`)
Formulario por pasos, mobile-first, con validación en vivo y mensajes claros:
1. **Contactos**: nombre, apellido, parentesco, WhatsApp (obligatorios); WhatsApp alternativo y email (opcionales). Botón "Agregar otro contacto". El primero queda indicado como "Contacto principal".
2. **Niños**: nombre, apellido, DNI, fecha de nacimiento (mostrar la edad calculada al lado), información adicional (textarea con el texto de ayuda "Alergias, medicación, condiciones o cualquier cosa que debamos saber"), turno (mañana/tarde) y asistencia (semanas con checkboxes + "Todas", o "Por día" con un selector que muestra solo los días hábiles válidos). Botón "Agregar otro niño" hasta 10.
3. **Revisión**: resumen de todo y botón "Enviar inscripción".
- Al enviar: pantalla **"¡Inscripción realizada con éxito!"** con el número de inscripción. Sin email.
- Protección anti-spam: campo honeypot y rate limit simple por IP en la API.

## Panel de administración (`/admin`)
- **Acceso**: una sola contraseña compartida definida en la variable de entorno `ADMIN_PASSWORD`. Login en `/admin/login`, cookie de sesión firmada (`SESSION_SECRET`), httpOnly y secure. Proteger con middleware todas las rutas `/admin/*` y `/api/admin/*`. Comparación de contraseña en tiempo constante.
- **Listado** (una fila por niño inscripto): filtros por temporada, grupo (incluida la opción "Sin grupo"), turno, semana, estado, "posibles duplicados", y búsqueda por nombre, apellido o DNI. Ordenado por fecha de alta (orden de la lista de espera). Cada fila tiene un botón que abre `https://wa.me/<numero>` del contacto principal.
- **Detalle/edición**: se puede modificar todo: datos del niño, grupo, turno, asistencia, estado, notas, responsables (agregar, quitar, cambiar el principal, editar datos) y familia (mover un niño a otra familia o unir familias).
- **Configuración**: temporadas (crear, editar, abrir y cerrar inscripción), semanas y grupos de edad, con las validaciones descritas arriba.

### Exportar CSV
- Botón "Descargar CSV" que respeta los filtros activos.
- Formato para Excel en español: UTF-8 **con BOM**, separador `;`, fechas `dd/mm/aaaa`.
- Una fila por niño inscripto, solo con datos del niño y del **contacto principal**. Columnas: `id` (de InscripcionNino), numero_inscripcion, fecha_alta, estado, nombre, apellido, dni, fecha_nacimiento, edad_al_inscribir, grupo, turno, modalidad, semanas_o_dias, info_adicional, posible_duplicado, contacto_nombre, contacto_apellido, contacto_parentesco, contacto_whatsapp, contacto_email.
- Escapar correctamente los campos que contengan `;`, comillas o saltos de línea. Prevenir inyección de fórmulas: si una celda empieza con `=`, `+`, `-` o `@`, anteponer `'`.

### Importar CSV modificado
- Se sube el mismo formato del export (aceptar `;` o `,` y con o sin BOM).
- Cada fila se cruza por la columna `id`. **Solo actualiza registros existentes**: las filas sin `id` o con un `id` inexistente se ignoran y se informan, y las filas que faltan en el archivo NO se borran.
- Columnas editables: estado, nombre, apellido, dni, fecha_nacimiento, grupo (por nombre; debe existir en la temporada), turno, info_adicional y los datos del contacto principal. Las columnas calculadas (edad, numero_inscripcion, fecha_alta, etc.) se ignoran.
- Primero se muestra una **vista previa** con los cambios campo por campo ("valor anterior → valor nuevo") y las filas con errores. Los cambios se aplican solo al confirmar, en una transacción. Las filas con error no se aplican.
- Advertencia en la vista previa: si se edita un contacto compartido por varios niños, el cambio afecta a todos esos niños.

## Marca: Capitán Animaciones

Nombre: **Capitán Animaciones**. Instagram: `@capitan.animaciones`.
Temática náutica y pirata: un capitán de barba roja, timón, barco, ancla, olas, botella con mensaje.
Tono: cercano, dinámico y divertido, con un lenguaje que invita a participar, jugar y compartir (por ejemplo "¡Sumate a la tripulación!"). Visualmente se prioriza el movimiento y la espontaneidad: animaciones suaves al hacer scroll y al pasar el mouse, con `prefers-reduced-motion` respetado.

### Paleta (definir como tokens en el tema de Tailwind / variables CSS)
- `naranja` #F15A23: color principal (botón "Inscribite", títulos destacados)
- `azul` #1D8FCE
- `amarillo` #FBA445
- `petroleo` #0D89A2
- `verde` #10A689
- `rojo` #D93520
- `violeta` #7D3766
- `marino` #093651: el azul oscuro del uniforme del capitán; usarlo para el header/footer y los textos sobre fondos claros
- `crema` #FFF4DB: fondo general de la página
- `texto` #3D3D3D: color del texto de cuerpo

Contraste: verificá WCAG AA. El texto blanco sobre #FBA445, #10A689 o #1D8FCE no llega a AA en tamaño normal. En esos fondos usá texto `marino`, y en los botones naranja usá texto blanco en negrita y tamaño grande, o `marino`. En el formulario y el panel, los colores de error, éxito, etc. tienen que ser legibles. Los colores vivos van como acentos, no como fondos de bloques de texto largos.

### Tipografías (cargarlas con next/font/google)
- **Fredoka** (500–700): títulos y botones
- **Poppins** (400–600): textos, formularios y panel

### Logos e ilustraciones (en `public/marca/`)
- `logo-texto.png`: logotipo multicolor "capitán animaciones" (para el header)
- `logo-circular.png`: capitán dentro del círculo (favicon e icono para compartir en redes / Open Graph)
- `capitan-timon.png`: capitán con el timón y el logotipo debajo
- `capitan-barco.png`: capitán en el barco con catalejo (para el banner principal)
- `capitan-colgado.png`: capitán colgado del logotipo (para la pantalla de "¡Inscripción realizada con éxito!")
- Ilustraciones decorativas sueltas (timón, ola, ancla, botella, barco): usarlas en las esquinas de las secciones, sin tapar contenido y ocultas o reducidas en el celular.
Mientras estos archivos no existan, usá placeholders con esos mismos nombres. Los voy a copiar yo más adelante.

### Estilo
- Fondo crema, tarjetas blancas con bordes bien redondeados (estilo "sticker" como el logo), sombras suaves.
- En el formulario, cada niño se muestra en una tarjeta con un acento de color distinto de la paleta, rotando entre ellos.
- El panel de administración usa la misma marca pero más sobria: fondo blanco, `marino` y `naranja` como acentos, y prioriza la legibilidad de las tablas.
- Centralizá colores, tipografías y rutas de logos en un único lugar, para que cambiarlos requiera tocar solo el tema y `src/config/sitio.ts`.

## Seguridad y privacidad
Son datos de menores (DNI e información de salud):
- Ninguna ruta pública devuelve datos de otras inscripciones.
- Toda la validación se repite en el servidor con Zod.
- No loguear datos personales.
- Los secretos solo van en variables de entorno. Crear `.env.example` (sin valores reales) y agregar `.env*` a `.gitignore` (excepto `.env.example`).

## Datos de ejemplo (seed)
Una temporada abierta con 2 semanas de lunes a viernes (fechas de ejemplo en enero del próximo año), grupos de edad de ejemplo (3–5, 6–8, 9–12) y algunas inscripciones de prueba con datos ficticios (incluyendo hermanos, un contacto compartido, un posible duplicado y un niño sin grupo).

## Entregables
- El código funcionando, más un `README.md` en español con los pasos para: crear la base en Neon, configurar `.env`, correr las migraciones y el seed, levantar el proyecto en local y publicarlo en Vercel (incluyendo qué variables de entorno cargar).
- Tests de las partes delicadas: normalización de WhatsApp, cálculo de edad y asignación de grupo, validación de superposición de grupos, generación del CSV e import del CSV.

## Plan de trabajo
1. Inicializar el proyecto (Next.js, Tailwind, Prisma, Zod) en esta misma carpeta, sin borrar `PROMPT.md` ni la carpeta `.git`.
2. Esquema Prisma, migración y seed. Cuando necesites la conexión a Neon, pedime que complete el `.env`: no me pidas las credenciales por el chat.
3. Lógica de dominio y validaciones, con tests.
4. Formulario público de inscripción y API.
5. Página de inicio.
6. Panel de administración: login, listado, edición y configuración.
7. Exportar e importar CSV.
8. README y verificación final (lint, tests, build).
