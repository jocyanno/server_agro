-- CreateEnum
CREATE TYPE "StatusOcorrencia" AS ENUM ('EM_ANALISE', 'VISTORIA_AGENDADA', 'VISTORIA_REALIZADA', 'SINISTRO_CONFIRMADO', 'SINISTRO_NAO_CONFIRMADO', 'INDENIZACAO_PAGA', 'ARQUIVADO');

-- CreateTable
CREATE TABLE "seguradora" (
    "id" TEXT NOT NULL,
    "numeroOcorrencia" SERIAL NOT NULL,
    "dataHoraRegistro" TIMESTAMP(3) NOT NULL,
    "tipoEvento" TEXT NOT NULL,
    "localizacao" TEXT NOT NULL,
    "descricaoInicial" TEXT NOT NULL,
    "status" "StatusOcorrencia" NOT NULL DEFAULT 'EM_ANALISE',
    "documentacaoRecebida" TEXT,
    "vistoriadorResponsavel" TEXT,
    "conclusaoVistoria" TEXT,
    "valorIndenizacao" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seguradora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seguradora_numeroOcorrencia_key" ON "seguradora"("numeroOcorrencia");

-- CreateIndex
CREATE INDEX "seguradora_numeroOcorrencia_idx" ON "seguradora"("numeroOcorrencia");

-- CreateIndex
CREATE INDEX "seguradora_dataHoraRegistro_idx" ON "seguradora"("dataHoraRegistro");

-- CreateIndex
CREATE INDEX "seguradora_status_idx" ON "seguradora"("status");
