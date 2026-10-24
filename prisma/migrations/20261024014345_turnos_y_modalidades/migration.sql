-- AlterTable
ALTER TABLE "Semana" ADD COLUMN     "activa" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Temporada" ADD COLUMN     "permitePorDia" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "permiteSemanas" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "turnos" "Turno"[] DEFAULT ARRAY['MANANA', 'TARDE']::"Turno"[];

-- Por ahora la colonia solo tiene el turno tarde y se inscribe por semanas
-- (primera y segunda semana). Se cambia desde Configuración.
UPDATE "Temporada" SET "turnos" = ARRAY['TARDE']::"Turno"[], "permitePorDia" = false;
