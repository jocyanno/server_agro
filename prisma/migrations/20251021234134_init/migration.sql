-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dados_apac" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "regiao" TEXT NOT NULL,
    "tendencia" TEXT NOT NULL,
    "min" INTEGER NOT NULL,
    "max" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dados_apac_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dados_cemaden" (
    "id" SERIAL NOT NULL,
    "cod_estacao" TEXT,
    "nome_estacao" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "lat" TEXT NOT NULL,
    "lon" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "valor_medida" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dados_cemaden_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_cod_estacao" ON "dados_cemaden"("cod_estacao", "data");

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_chuvas_acumuladas AS
WITH hourly AS (
  SELECT
    cod_estacao,
    date_trunc('hour', data) AS hora,
    SUM(valor_medida)        AS mm_hora
  FROM dados_cemaden
  WHERE data > now() - INTERVAL '46 days'
  GROUP BY cod_estacao, date_trunc('hour', data)
)
SELECT
  h.cod_estacao,
  now() AT TIME ZONE 'UTC' AS snapshot_at,
  COALESCE(SUM(h.mm_hora) FILTER (WHERE h.hora > now() - INTERVAL '24 hours'), 0)  AS chuva_24h,
  COALESCE(SUM(h.mm_hora) FILTER (WHERE h.hora > now() - INTERVAL '3 days'),   0)  AS chuva_3d,
  COALESCE(SUM(h.mm_hora) FILTER (WHERE h.hora > now() - INTERVAL '7 days'),   0)  AS chuva_7d,
  COALESCE(SUM(h.mm_hora) FILTER (WHERE h.hora > now() - INTERVAL '15 days'),  0)  AS chuva_15d,
  COALESCE(SUM(h.mm_hora) FILTER (WHERE h.hora > now() - INTERVAL '30 days'),  0)  AS chuva_30d,
  COALESCE(SUM(h.mm_hora) FILTER (WHERE h.hora > now() - INTERVAL '45 days'),  0)  AS chuva_45d
FROM hourly h
GROUP BY h.cod_estacao;

-- Unique index needed for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_chuvas_acumuladas_cod
  ON mv_chuvas_acumuladas (cod_estacao);
