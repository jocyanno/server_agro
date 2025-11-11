-- CreateTable
CREATE TABLE "estacoes" (
    "id" SERIAL NOT NULL,
    "codestacao" TEXT NOT NULL,
    "id_tipoestacao" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estacoes_codestacao_key" ON "estacoes"("codestacao");
