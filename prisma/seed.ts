// Datos de ejemplo (ficticios) para desarrollo.
//
//   npm run db:seed               -> carga los datos si la base está vacía
//   npm run db:seed:reset         -> BORRA TODO y vuelve a cargar
//
// Incluye: hermanos (en la misma inscripción y en inscripciones distintas),
// contactos compartidos, un posible duplicado de DNI y un niño sin grupo.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Modalidad } from "../src/generated/prisma/client";
import { asignarGrupo, calcularEdad } from "../src/lib/dominio/edad";
import { hoyEnArgentina, sumarDias } from "../src/lib/dominio/fechas";

// El seed usa la conexión directa, igual que las migraciones.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
});

const TABLAS = [
  "InscripcionDia",
  "InscripcionSemana",
  "InscripcionNino",
  "Inscripcion",
  "NinoResponsable",
  "Nino",
  "Responsable",
  "Familia",
  "GrupoEdad",
  "Semana",
  "Temporada",
];

const hoy = hoyEnArgentina();

/** Fecha de nacimiento para que hoy tenga `anios` cumplidos (y unos meses). */
function nacidoHace(anios: number, diasExtra = 45): Date {
  const fecha = new Date(hoy);
  fecha.setUTCFullYear(fecha.getUTCFullYear() - anios);
  return sumarDias(fecha, -diasExtra);
}

/** Primer lunes de enero del año que viene. */
function primerLunesDeEnero(anio: number): Date {
  let fecha = new Date(Date.UTC(anio, 0, 1));
  while (fecha.getUTCDay() !== 1) fecha = sumarDias(fecha, 1);
  return fecha;
}

interface NinoSeed {
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: Date;
  infoAdicional?: string;
  semanas?: number[]; // números de opción (modalidad SEMANAS)
  dias?: Date[]; // modalidad POR_DIA
  posibleDuplicado?: boolean;
}

async function main() {
  const reset = process.argv.includes("--reset");
  const temporadas = await prisma.temporada.count();
  if (temporadas > 0 && !reset) {
    console.log("La base ya tiene datos. Para borrarlos y recargar: npm run db:seed:reset");
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (reset) {
      const lista = TABLAS.map((t) => `"${t}"`).join(", ");
      await tx.$executeRawUnsafe(`TRUNCATE ${lista} RESTART IDENTITY CASCADE`);
    }

    const anio = hoy.getUTCFullYear() + 1;
    const lunes1 = primerLunesDeEnero(anio);
    const lunes2 = sumarDias(lunes1, 14);

    const temporada = await tx.temporada.create({
      data: {
        nombre: `Colonia de verano ${anio}`,
        anio,
        inscripcionAbierta: true,
        precioColoniaCompleta: 230000,
        semanas: {
          create: [
            { numero: 1, nombre: "Quincena 1", fechaInicio: lunes1, fechaFin: sumarDias(lunes1, 11), precio: 130000 },
            { numero: 2, nombre: "Quincena 2", fechaInicio: lunes2, fechaFin: sumarDias(lunes2, 11), precio: 130000 },
          ],
        },
        gruposEdad: {
          create: [
            { nombre: "Grumetes (3 a 5)", edadMin: 3, edadMax: 5 },
            { nombre: "Marineros (6 a 8)", edadMin: 6, edadMax: 8 },
            { nombre: "Piratas (9 a 12)", edadMin: 9, edadMax: 12 },
          ],
        },
      },
      include: { semanas: true, gruposEdad: true },
    });

    const semanaPorNumero = new Map(temporada.semanas.map((s) => [s.numero, s.id]));

    const crearResponsable = (nombre: string, apellido: string, whatsapp: string, email?: string) =>
      tx.responsable.create({ data: { nombre, apellido, whatsapp, email } });

    /** Replica lo que hace el formulario: vincula todos los contactos a todos los niños. */
    async function inscribir(
      familiaId: number,
      contactos: { id: number; parentesco: string }[],
      ninos: NinoSeed[],
    ) {
      const inscripcion = await tx.inscripcion.create({
        data: {
          temporadaId: temporada.id,
          familiaId,
          responsablePrincipalId: contactos[0].id,
        },
      });

      for (const n of ninos) {
        const edad = calcularEdad(n.fechaNacimiento, hoy);
        const grupo = asignarGrupo(edad, temporada.gruposEdad);
        await tx.nino.create({
          data: {
            familiaId,
            nombre: n.nombre,
            apellido: n.apellido,
            dni: n.dni,
            fechaNacimiento: n.fechaNacimiento,
            infoAdicional: n.infoAdicional,
            responsables: {
              create: contactos.map((c, i) => ({
                responsableId: c.id,
                parentesco: c.parentesco,
                esPrincipal: i === 0,
                orden: i,
              })),
            },
            inscripciones: {
              create: {
                inscripcionId: inscripcion.id,
                grupoEdadId: grupo?.id ?? null,
                edadAlInscribir: edad,
                modalidad: n.dias ? Modalidad.POR_DIA : Modalidad.SEMANAS,
                posibleDuplicado: n.posibleDuplicado ?? false,
                semanas: n.semanas
                  ? { create: n.semanas.map((num) => ({ semanaId: semanaPorNumero.get(num)! })) }
                  : undefined,
                dias: n.dias
                  ? {
                      create: n.dias.map((fecha) => ({
                        fecha,
                        semanaId: temporada.semanas.find((s) => s.fechaInicio <= fecha && fecha <= s.fechaFin)!.id,
                      })),
                    }
                  : undefined,
              },
            },
          },
        });
      }
      return inscripcion;
    }

    const todas = [1, 2];

    // 1) Familia García: dos hermanos, dos contactos (compartidos por ambos niños).
    const garcia = await tx.familia.create({ data: {} });
    const laura = await crearResponsable("Laura", "García", "+5491123456789", "laura.garcia@example.com");
    const diego = await crearResponsable("Diego", "García", "+5491134567890");
    await inscribir(
      garcia.id,
      [
        { id: laura.id, parentesco: "Madre" },
        { id: diego.id, parentesco: "Padre" },
      ],
      [
        {
          nombre: "Tomás",
          apellido: "García",
          dni: "50111222",
          fechaNacimiento: nacidoHace(7),
          infoAdicional: "Alérgico al maní.",
          semanas: todas,
        },
        {
          nombre: "Sofía",
          apellido: "García",
          dni: "52333444",
          fechaNacimiento: nacidoHace(4),
          semanas: todas,
        },
      ],
    );

    // 2) Familia Pérez: un niño por días sueltos.
    const perez = await tx.familia.create({ data: {} });
    const martin = await crearResponsable("Martín", "Pérez", "+5493514567890");
    await inscribir(
      perez.id,
      [{ id: martin.id, parentesco: "Padre" }],
      [
        {
          nombre: "Lucas",
          apellido: "Pérez",
          dni: "47555666",
          fechaNacimiento: nacidoHace(10),
          dias: [lunes1, sumarDias(lunes1, 2), sumarDias(lunes2, 4)],
        },
      ],
    );

    // 3) Laura vuelve a inscribir (mismo WhatsApp): se reutiliza su registro y la
    //    hermana mayor queda en la familia García. Con 14 años queda "sin grupo".
    await inscribir(
      garcia.id,
      [{ id: laura.id, parentesco: "Madre" }],
      [
        {
          nombre: "Valentina",
          apellido: "García",
          dni: "46777888",
          fechaNacimiento: nacidoHace(14),
          semanas: [2],
        },
      ],
    );

    // 4) Otra persona inscribe a Lucas Pérez con el mismo DNI: posible duplicado.
    const fernandez = await tx.familia.create({ data: {} });
    const ana = await crearResponsable("Ana", "Fernández", "+5492614567891", "ana.f@example.com");
    await inscribir(
      fernandez.id,
      [{ id: ana.id, parentesco: "Madre" }],
      [
        {
          nombre: "Lucas",
          apellido: "Pérez Fernández",
          dni: "47555666",
          fechaNacimiento: nacidoHace(10),
          semanas: todas,
          posibleDuplicado: true,
        },
      ],
    );

    // 5) Familia Rodríguez: la abuela como segundo contacto, solo la quincena 1.
    const rodriguez = await tx.familia.create({ data: {} });
    const juan = await crearResponsable("Juan", "Rodríguez", "+5491145678901");
    const marta = await crearResponsable("Marta", "Gómez", "+5491156789012");
    await inscribir(
      rodriguez.id,
      [
        { id: juan.id, parentesco: "Padre" },
        { id: marta.id, parentesco: "Abuela" },
      ],
      [
        {
          nombre: "Emma",
          apellido: "Rodríguez",
          dni: "53999000",
          fechaNacimiento: nacidoHace(5),
          infoAdicional: "Usa anteojos. Toma medicación para el asma (la trae en la mochila).",
          semanas: [1],
        },
      ],
    );
  }, { timeout: 60_000 });

  const [inscripciones, ninos, sinGrupo, duplicados] = await Promise.all([
    prisma.inscripcion.count(),
    prisma.inscripcionNino.count(),
    prisma.inscripcionNino.count({ where: { grupoEdadId: null } }),
    prisma.inscripcionNino.count({ where: { posibleDuplicado: true } }),
  ]);
  console.log(
    `Seed listo: ${inscripciones} inscripciones, ${ninos} niños inscriptos, ` +
      `${sinGrupo} sin grupo, ${duplicados} posible duplicado.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
