// Crea un usuario del panel desde la terminal (npm run usuarios:crear).
// Sirve para el primer usuario con acceso total; los demás se crean desde el
// panel (Usuarios). Pide la contraseña sin mostrarla en pantalla.
//
//   npm run usuarios:crear                         -> pregunta todo, rol "total"
//   npm run usuarios:crear -- --rol administrador  -> otro rol (por su clave)
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { hashearPassword, problemaPassword } from "../src/lib/auth/claves";
import { prisma } from "../src/lib/prisma";

const salidaMuda = new Writable({ write: (_c, _e, listo) => listo() });

function preguntar(texto: string, oculta = false): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(texto);
    const rl = createInterface({ input: process.stdin, output: oculta ? salidaMuda : process.stdout, terminal: true });
    rl.question(oculta ? "" : "", (respuesta) => {
      rl.close();
      if (oculta) process.stdout.write("\n");
      resolve(respuesta.trim());
    });
  });
}

async function main() {
  const indice = process.argv.indexOf("--rol");
  const claveRol = indice > -1 ? process.argv[indice + 1] : "total";
  const rol = await prisma.rol.findUnique({ where: { clave: claveRol } });
  if (!rol) throw new Error(`No existe el rol "${claveRol}". Roles: ${(await prisma.rol.findMany()).map((r) => r.clave).join(", ")}`);

  const email = (await preguntar("Email: ")).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Email inválido.");
  if (await prisma.usuario.findUnique({ where: { email } })) throw new Error("Ya hay un usuario con ese email.");
  const nombre = await preguntar("Nombre: ");
  if (!nombre) throw new Error("Falta el nombre.");

  // Para automatizar (por ejemplo en pruebas) se puede pasar la contraseña por variable de entorno.
  let password = process.env.NUEVO_USUARIO_PASSWORD ?? "";
  if (!password) {
    password = await preguntar("Contraseña (no se ve mientras escribís): ", true);
    if ((await preguntar("Repetila: ", true)) !== password) throw new Error("Las contraseñas no coinciden.");
  }
  const problema = problemaPassword(password, email);
  if (problema) throw new Error(problema);

  const usuario = await prisma.usuario.create({ data: { email, nombre, rolId: rol.id, passwordHash: await hashearPassword(password) } });
  await prisma.registro.create({
    data: { accion: "usuario.crear", entidad: "usuario", entidadId: String(usuario.id), detalle: { email, nombre, rol: rol.nombre, desde: "terminal" } },
  });
  console.log(`Listo: ${email} (${rol.nombre}) ya puede entrar al panel.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("No se pudo crear el usuario:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
