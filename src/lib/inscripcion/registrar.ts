import "server-only";
import { VERSION_PRIVACIDAD } from "@/config/inscripcion";
import { asignarGrupo, calcularEdad } from "@/lib/dominio/edad";
import { elegirFamilia, type ContactoExistente } from "@/lib/dominio/familia";
import { fechaDesdeIso } from "@/lib/dominio/fechas";
import { prisma } from "@/lib/prisma";
import type { TemporadaAbierta } from "@/lib/temporada";
import type { InscripcionValidada } from "@/lib/validacion/inscripcion";

/**
 * Guarda una inscripción ya validada en una única transacción (si algo falla,
 * no se guarda nada) y devuelve el número de inscripción.
 *
 * - Un contacto con WhatsApp ya existente se reutiliza SIN modificar sus datos.
 * - Los niños se suman a la familia de un contacto existente, si la hay.
 * - Un DNI ya inscripto en la temporada se acepta y se marca como posible duplicado.
 */
export async function registrarInscripcion(
  datos: InscripcionValidada,
  temporada: TemporadaAbierta,
  hoy: Date,
): Promise<number> {
  return prisma.$transaction(
    async (tx) => {
      const responsableIds: number[] = [];
      const existentes: (ContactoExistente | null)[] = [];

      for (const c of datos.contactos) {
        const previo = await tx.responsable.findUnique({
          where: { whatsapp: c.whatsapp },
          select: { id: true, ninos: { select: { nino: { select: { familiaId: true } } } } },
        });
        if (previo) {
          responsableIds.push(previo.id);
          existentes.push({
            responsableId: previo.id,
            familiaIds: [...new Set(previo.ninos.map((n) => n.nino.familiaId))],
          });
        } else {
          const nuevo = await tx.responsable.create({
            data: {
              nombre: c.nombre,
              apellido: c.apellido,
              whatsapp: c.whatsapp,
              whatsappAlt: c.whatsappAlt,
              email: c.email,
            },
            select: { id: true },
          });
          responsableIds.push(nuevo.id);
          existentes.push(null);
        }
      }

      const { familiaId: familiaExistente, notaAdmin } = elegirFamilia(existentes);
      const familiaId = familiaExistente ?? (await tx.familia.create({ data: {} })).id;

      const inscripcion = await tx.inscripcion.create({
        data: {
          temporadaId: temporada.id,
          familiaId,
          responsablePrincipalId: responsableIds[0],
          // La API solo llega hasta acá si la casilla de privacidad está marcada.
          privacidadAceptadaEn: new Date(),
          privacidadVersion: VERSION_PRIVACIDAD,
        },
        select: { id: true, numero: true },
      });

      for (const n of datos.ninos) {
        const fechaNacimiento = fechaDesdeIso(n.fechaNacimiento);
        const edad = calcularEdad(fechaNacimiento, hoy);
        const grupo = asignarGrupo(edad, temporada.grupos);
        const yaInscripto = await tx.inscripcionNino.count({
          where: { nino: { dni: n.dni }, inscripcion: { temporadaId: temporada.id } },
        });

        await tx.nino.create({
          data: {
            familiaId,
            nombre: n.nombre,
            apellido: n.apellido,
            dni: n.dni,
            fechaNacimiento,
            infoAdicional: n.infoAdicional,
            responsables: {
              create: datos.contactos.map((c, i) => ({
                responsableId: responsableIds[i],
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
                turno: n.turno,
                modalidad: n.modalidad,
                posibleDuplicado: yaInscripto > 0,
                notasAdmin: notaAdmin,
                semanas: { create: n.semanas.map((semanaId) => ({ semanaId })) },
                dias: { create: n.dias.map((dia) => ({ fecha: fechaDesdeIso(dia) })) },
              },
            },
          },
          select: { id: true },
        });
      }

      return inscripcion.numero;
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
}
