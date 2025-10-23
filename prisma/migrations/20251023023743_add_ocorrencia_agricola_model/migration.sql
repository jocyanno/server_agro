-- CreateEnum
CREATE TYPE "StatusInicialAgro" AS ENUM ('EM_ANALISE', 'VISTORIA_AGENDADA', 'VISTORIA_REALIZADA');

-- CreateEnum
CREATE TYPE "StatusFinalAgro" AS ENUM ('SINISTRO_CONFIRMADO', 'NAO_COBERTO', 'INDENIZACAO_PAGA', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "EventoClimatico" AS ENUM ('EXCESSO_CHUVA', 'SECA', 'GRANIZO', 'GEADA', 'VENDAVAL', 'INCENDIO', 'PRAGA', 'DOENCA');

-- CreateTable
CREATE TABLE "ocorrencia_agricola" (
    "id" TEXT NOT NULL,
    "numeroOcorrencia" SERIAL NOT NULL,
    "produtor" TEXT NOT NULL,
    "codigoPropriedade" TEXT NOT NULL,
    "culturaAfetada" TEXT NOT NULL,
    "areaPlantada" DOUBLE PRECISION NOT NULL,
    "eventoClimatico" "EventoClimatico" NOT NULL,
    "dataInicioEvento" TIMESTAMP(3) NOT NULL,
    "dataFimEvento" TIMESTAMP(3),
    "descricaoDano" TEXT NOT NULL,
    "percentualPerda" INTEGER NOT NULL,
    "statusInicial" "StatusInicialAgro" NOT NULL DEFAULT 'EM_ANALISE',
    "statusFinal" "StatusFinalAgro",
    "valorEstimadoPerda" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocorrencia_agricola_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ocorrencia_agricola_numeroOcorrencia_key" ON "ocorrencia_agricola"("numeroOcorrencia");

-- CreateIndex
CREATE INDEX "ocorrencia_agricola_numeroOcorrencia_idx" ON "ocorrencia_agricola"("numeroOcorrencia");

-- CreateIndex
CREATE INDEX "ocorrencia_agricola_produtor_idx" ON "ocorrencia_agricola"("produtor");

-- CreateIndex
CREATE INDEX "ocorrencia_agricola_statusInicial_idx" ON "ocorrencia_agricola"("statusInicial");

-- CreateIndex
CREATE INDEX "ocorrencia_agricola_statusFinal_idx" ON "ocorrencia_agricola"("statusFinal");

-- CreateIndex
CREATE INDEX "ocorrencia_agricola_eventoClimatico_idx" ON "ocorrencia_agricola"("eventoClimatico");
