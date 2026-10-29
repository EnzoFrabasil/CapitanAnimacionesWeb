-- Estado nuevo entre "En espera" y "Confirmado": ya se le escribió a la familia.
ALTER TYPE "EstadoInscripcion" ADD VALUE 'CONTACTADO' BEFORE 'CONFIRMADO';

-- La marca "contactado" por familia queda reemplazada por el estado (no tenía datos).
ALTER TABLE "ContactoFamilia" DROP CONSTRAINT "ContactoFamilia_familiaId_fkey";
ALTER TABLE "ContactoFamilia" DROP CONSTRAINT "ContactoFamilia_temporadaId_fkey";
DROP TABLE "ContactoFamilia";
