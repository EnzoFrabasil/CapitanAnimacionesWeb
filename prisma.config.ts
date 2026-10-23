import "dotenv/config";
import { defineConfig } from "prisma/config";

// La CLI de Prisma (migraciones, seed) usa la conexión directa de Neon (DIRECT_URL).
// La app en runtime usa la conexión pooled (DATABASE_URL), ver src/lib/prisma.ts.
// Se lee con process.env (y no con env()) para que `prisma generate` funcione sin .env.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});
