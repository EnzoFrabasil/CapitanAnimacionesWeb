# Capitán Animaciones · Inscripción a la colonia (beta)

Sitio de la colonia de vacaciones de Capitán Animaciones con:

- **Página de inicio** (`/`): información, ubicación con mapa, preguntas frecuentes, redes y WhatsApp.
- **Formulario de inscripción** (`/inscripcion`): por pasos, pensado para el celular. Anota a los chicos en una **lista de espera** (todavía no hay pagos).
- **Panel de administración** (`/admin`): listado con filtros, edición de cada inscripto, configuración de temporadas, semanas y grupos de edad, y exportación/importación de CSV para Excel.

Stack: Next.js 16 (App Router) + TypeScript, Tailwind CSS 4, PostgreSQL en Neon con Prisma 7, Zod y libphonenumber-js. Se publica en Vercel.

`PROMPT.md` tiene los requisitos completos del proyecto.

---

## 1. Requisitos

- **Node.js** 20.19 o más nuevo (o 22.12+, o 24+) y npm.
- Una cuenta gratuita en [Neon](https://neon.tech) (base de datos) y otra en [Vercel](https://vercel.com) (publicación).
- Git.

## 2. Crear la base de datos en Neon

1. Entrá a <https://console.neon.tech> y creá un proyecto nuevo (por ejemplo `capitan-animaciones`). Elegí la región **AWS São Paulo (sa-east-1)**, que es la más cercana a Argentina.
2. En el proyecto, tocá **Connect**. Vas a necesitar **dos cadenas de conexión** de la misma base (`neondb`):
   - **Pooled** (con la opción *Connection pooling* activada): el host contiene `-pooler`. La usa la aplicación.
   - **Directa** (con *Connection pooling* desactivado): el host **no** contiene `-pooler`. La usan las migraciones y el seed.
3. Copiá las dos; las vas a pegar en el `.env` en el paso siguiente. Al final de cada una, usá `sslmode=verify-full`.

## 3. Configurar el `.env`

```bash
cp .env.example .env
```

Completá el `.env` (nunca lo subas al repositorio; ya está en `.gitignore`):

| Variable | Qué es |
| --- | --- |
| `DATABASE_URL` | Cadena **pooled** de Neon (con `-pooler`). |
| `DIRECT_URL` | Cadena **directa** de Neon (sin `-pooler`). |
| `ADMIN_PASSWORD` | Contraseña compartida del panel `/admin`. |
| `SESSION_SECRET` | Texto aleatorio de **32 caracteres o más** para firmar la sesión del panel. Generalo con `openssl rand -base64 32` o `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. |

**Acceso al panel según la configuración:**

| `ADMIN_PASSWORD` | Desarrollo (`npm run dev`) | Producción (Vercel o `npm start`) |
| --- | --- | --- |
| Vacía | Se entra **sin contraseña** (con un aviso arriba). | El panel queda **bloqueado**. |
| Cargada, con `SESSION_SECRET` válido | Pide contraseña. | Pide contraseña. |

## 4. Instalar, migrar y cargar datos de ejemplo

```bash
npm install          # también genera el cliente de Prisma
npm run db:migrate   # crea las tablas en Neon (usa DIRECT_URL)
npm run db:seed      # carga datos ficticios de ejemplo
```

El seed crea una temporada **abierta** con 2 semanas de enero del año próximo, grupos de edad 3–5, 6–8 y 9–12, y algunas inscripciones de prueba: hermanos, un contacto compartido, un posible duplicado y un niño sin grupo.

- `npm run db:seed` no hace nada si la base ya tiene datos.
- `npm run db:seed:reset` **borra todos los datos** y vuelve a cargar el ejemplo. No lo uses con la base de producción.

## 5. Levantar el proyecto en local

```bash
npm run dev
```

- Sitio: <http://localhost:3000>
- Formulario: <http://localhost:3000/inscripcion>
- Panel: <http://localhost:3000/admin>

Otros comandos:

| Comando | Para qué |
| --- | --- |
| `npm test` | Tests (Vitest): WhatsApp, edad y grupos, superposición de grupos, CSV, sesión, etc. |
| `npm run lint` | Revisa el código con ESLint. |
| `npm run build` | Compila para producción (también verifica tipos). |
| `npm start` | Corre la versión compilada (modo producción). |
| `npm run db:migrate` | Crea una migración nueva si cambiás `prisma/schema.prisma` (solo en desarrollo). |
| `npm run db:deploy` | Aplica las migraciones pendientes (para producción). |

## 6. Publicar en Vercel

1. Subí el repositorio a GitHub (ya está en `github.com/EnzoFrabasil/CapitanAnimacionesWeb`).
2. En Vercel: **Add New… → Project**, importá el repositorio. Vercel detecta Next.js solo.
3. En **Environment Variables** cargá estas 4 variables (para *Production* y, si querés, *Preview*):
   - `DATABASE_URL` (pooled)
   - `DIRECT_URL` (directa)
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
4. Para que cada deploy aplique las migraciones pendientes, en **Settings → Build and Deployment → Build Command** poné:
   ```
   npm run db:deploy && npm run build
   ```
   (Alternativa: dejá el build por defecto y corré `npm run db:deploy` desde tu máquina, con el `.env` apuntando a la base de producción, antes de cada deploy que cambie el esquema.)
5. **Deploy**. El sitio queda en `https://<nombre-del-proyecto>.vercel.app`.
6. Si en el futuro cambiás una variable de entorno, hacé **Redeploy** para que tome el valor nuevo.

> **Base de producción:** lo más prolijo es usar en Vercel una base (o *branch* de Neon) distinta de la de desarrollo, y **no** correr el seed ahí. Creá la temporada real desde **Panel → Configuración**.

### Primeros pasos en producción

1. Entrá a `/admin` con la contraseña.
2. En **Configuración**: creá la temporada, cargá las semanas y los grupos de edad, y tocá **Abrir inscripción**. Mientras ninguna temporada esté abierta, el formulario muestra "Las inscripciones están cerradas".

## 7. Contenido, marca e imágenes

- **Textos y datos del sitio:** todo está en `src/config/sitio.ts` (nombre, textos, WhatsApp de la colonia, dirección del mapa, redes, preguntas frecuentes y rutas de imágenes). **Todo lo marcado con `TODO` es un ejemplo para reemplazar**, en particular:
  - el número de WhatsApp de la colonia,
  - el nombre del lugar y la dirección (con la dirección se arma el mapa),
  - los textos de las secciones y las respuestas de las preguntas frecuentes,
  - los enlaces de Facebook y TikTok (si no se usan, borralos de la lista `redes`).
- **Colores y tipografías:** en `src/app/globals.css` (bloque `@theme`). Los nombres (`naranja`, `marino`, `crema`, etc.) se usan como clases de Tailwind (`bg-naranja`, `text-marino`).
- **Límites del formulario** (edad mínima y máxima, máximo de chicos): `src/config/inscripcion.ts`.
- **Imágenes:** en `public/marca/` hay *placeholders* con los nombres definitivos. Reemplazalos por los archivos reales **con el mismo nombre**:
  - `logo-texto.png`: logotipo del encabezado.
  - `logo-circular.png`: favicon e imagen para compartir en redes.
  - `capitan-timon.png`, `capitan-barco.png` (banner principal), `capitan-colgado.png` (pantalla de éxito).
  - Ilustraciones decorativas: `timon.png`, `estrella.svg`, `ancla.png`, `botella.png`, `barco.png`.

## 8. Cómo funciona

### Inscripción

- El WhatsApp se acepta escrito de cualquier forma ("11 2345-6789", "011 15 2345 6789", "+54 9 11…") y se guarda como `+549…`. Se rechaza si no es un celular argentino válido.
- Si un WhatsApp ya existe, se reutiliza ese contacto **sin modificar sus datos** y los chicos nuevos se suman a su familia. Si los contactos ya estaban en familias distintas, se usa la del primero, **no se unen automáticamente** y queda una nota interna para revisarlo en el panel.
- Si un DNI ya está inscripto en la misma temporada, la inscripción se acepta y se marca como **posible duplicado** (la familia no recibe ningún aviso).
- La edad se calcula al inscribir (con la fecha de Argentina) y no se recalcula. El grupo se asigna por rango de edad; si no entra en ninguno queda "sin grupo".
- Todo se guarda en una única transacción. Hay protección anti-spam (campo oculto y límite de envíos por IP).

### Panel

- **Inscriptos:** una fila por niño en orden de lista de espera, con filtros y búsqueda, botón de WhatsApp y **Descargar CSV** (respeta los filtros).
- **Ficha de cada inscripto:** se puede editar todo: datos, grupo, turno, asistencia, estado, notas, contactos (agregar, quitar, cambiar el principal) y familia (mover o unir).
- **Configuración:** temporadas (solo una abierta a la vez), semanas y grupos de edad. Editar los grupos no reasigna a los ya inscriptos; para eso está **Asignar grupo a los niños sin grupo**.
- **Importar CSV:** se sube el archivo descargado y modificado en Excel. Primero se muestra una vista previa ("valor anterior → valor nuevo", errores y filas ignoradas) y los cambios se aplican solo al confirmar.

### Datos y privacidad

Son datos de menores (DNI e información de salud):

- Ninguna ruta pública devuelve datos de otras inscripciones.
- Toda la validación se repite en el servidor con Zod (el mismo esquema que usa el formulario).
- Los logs no incluyen datos personales.
- Los secretos van solo en variables de entorno.
- El límite de envíos por IP se guarda en memoria: en Vercel cada instancia lleva su propia cuenta, así que frena envíos automáticos pero no es exacto.

## 9. Estructura

```
prisma/
  schema.prisma        Modelo de datos (preparado para sumar Pase, Pago, Descuento, Comprobante y Tarifa)
  migrations/          Migraciones
  seed.ts              Datos de ejemplo
src/
  app/                 Páginas: inicio, /inscripcion, /admin y APIs
  components/          Componentes de la marca y del panel
  config/              sitio.ts (contenido) e inscripcion.ts (límites)
  lib/
    dominio/           Reglas puras: WhatsApp, DNI, edad, grupos, días, familia
    validacion/        Esquemas Zod (formulario y panel)
    csv/               Generación, lectura e importación de CSV
    admin/             Consultas y acciones del panel
    auth/              Sesión del panel
  proxy.ts             Protección de /admin y /api/admin
```
