import { MultipartFile } from "@fastify/multipart";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { CemadenData } from "../types/cemaden-data.type";
import * as XLSX from "xlsx";
import { parseCemadenDate } from "../utils/parse-date";
import { ChuvasAcumuladas } from "../types/chuvas-acumuladas.type";

export class CemadenService {
  async importData(files: AsyncIterableIterator<MultipartFile>): Promise<string> {
    const dataToInsert: any[] = [];
    for await (const part of files) {
      if (part.type === "file") {
        const buffer = await part.toBuffer();

        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data: CemadenData[] = XLSX.utils.sheet_to_json(worksheet);

        for (const row of data) {
          const valorMedidaStr = row["valorMedida"] as string;
          const valorMedida = parseFloat(valorMedidaStr);
          
          // Validação: valores de chuva devem estar entre 0 e 1000mm
          // Valores muito altos (como timestamps) são considerados inválidos
          if (isNaN(valorMedida) || valorMedida < 0 || valorMedida > 1000) {
            console.warn(`Valor de chuva inválido ignorado: ${valorMedidaStr} para estação ${row["codEstacao"]}`);
            continue; // Pula este registro
          }
          
          dataToInsert.push({
            uf: row["uf"] as string,
            codEstacao: row["codEstacao"] as string,
            nomeEstacao: row["nomeEstacao"] as string,
            dataHora: parseCemadenDate(row["datahora"] as string),
            lat: row["latitude"] as string,
            lon: row["longitude"] as string,
            valorMedida: valorMedida,
          });
        }
      }
    }

    await (prisma as any).dadosCemaden.createMany({
      data: dataToInsert.map((item) => ({
        uf: item.uf,
        codEstacao: item.codEstacao,
        nomeEstacao: item.nomeEstacao,
        data: item.dataHora,
        lat: String(item.lat),
        lon: String(item.lon),
        valorMedida: item.valorMedida,
      })),
      skipDuplicates: true,
    });

    await prisma.$executeRawUnsafe(
      'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_chuvas_acumuladas;'
    );

    return `Importação concluída com sucesso. Total de registros importados: ${dataToInsert.length}`;
  }

  async getChuvasAcumuladas(
    codEstacao: string,
    dataInicio?: string,
    dataFim?: string
  ): Promise<ChuvasAcumuladas[]> {
    // Se não houver filtro de data, pega TODOS os dados disponíveis
    // Se houver filtro, usa o período especificado
    const startDate = dataInicio || `(SELECT MIN(data) FROM dados_cemaden WHERE cod_estacao = '${codEstacao}')`;
    const endDate = dataFim || 'now()';
    
    const query = `
      WITH daily_data AS (
        SELECT 
          cod_estacao,
          date_trunc('day', data) AS data_dia,
          SUM(valor_medida) AS mm_dia
        FROM dados_cemaden
        WHERE cod_estacao = '${codEstacao}'
          AND data >= ${startDate}::timestamp
          AND data <= ${endDate}::timestamp
          AND valor_medida >= 0 
          AND valor_medida <= 1000  -- Filtra dados corrompidos
        GROUP BY cod_estacao, date_trunc('day', data)
      ),
      date_series AS (
        SELECT generate_series(
          ${startDate}::timestamp,
          ${endDate}::timestamp,
          '1 day'::interval
        ) AS snapshot_date
      )
      SELECT
        '${codEstacao}' AS cod_estacao,
        ds.snapshot_date AT TIME ZONE 'UTC' AS snapshot_at,
        COALESCE(SUM(dd.mm_dia) FILTER (WHERE dd.data_dia > ds.snapshot_date - INTERVAL '24 hours' AND dd.data_dia <= ds.snapshot_date), 0) AS chuva_24h,
        COALESCE(SUM(dd.mm_dia) FILTER (WHERE dd.data_dia > ds.snapshot_date - INTERVAL '3 days' AND dd.data_dia <= ds.snapshot_date), 0) AS chuva_3d,
        COALESCE(SUM(dd.mm_dia) FILTER (WHERE dd.data_dia > ds.snapshot_date - INTERVAL '7 days' AND dd.data_dia <= ds.snapshot_date), 0) AS chuva_7d,
        COALESCE(SUM(dd.mm_dia) FILTER (WHERE dd.data_dia > ds.snapshot_date - INTERVAL '15 days' AND dd.data_dia <= ds.snapshot_date), 0) AS chuva_15d,
        COALESCE(SUM(dd.mm_dia) FILTER (WHERE dd.data_dia > ds.snapshot_date - INTERVAL '30 days' AND dd.data_dia <= ds.snapshot_date), 0) AS chuva_30d,
        COALESCE(SUM(dd.mm_dia) FILTER (WHERE dd.data_dia > ds.snapshot_date - INTERVAL '45 days' AND dd.data_dia <= ds.snapshot_date), 0) AS chuva_45d
      FROM date_series ds
      LEFT JOIN daily_data dd ON dd.cod_estacao = '${codEstacao}'
      GROUP BY ds.snapshot_date
      ORDER BY ds.snapshot_date DESC
    `;

    const rows = await prisma.$queryRawUnsafe<ChuvasAcumuladas[]>(query);
    return rows;
  }

  async cleanCorruptedData(): Promise<string> {
    // Remove registros com valores de chuva inválidos (muito altos, negativos ou NaN)
    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM dados_cemaden 
      WHERE valor_medida < 0 
         OR valor_medida > 1000 
         OR valor_medida IS NULL
    `);

    // Atualiza a view materializada
    await prisma.$executeRawUnsafe(
      'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_chuvas_acumuladas;'
    );

    return `Limpeza concluída. ${result} registros corrompidos removidos.`;
  }
}

export const cemadenService = new CemadenService();