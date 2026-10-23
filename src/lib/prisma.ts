import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Una sola instancia por proceso (en desarrollo, el hot reload recrearía conexiones).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function crearCliente() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
