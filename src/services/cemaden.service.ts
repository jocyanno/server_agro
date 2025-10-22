import { MultipartFile } from "@fastify/multipart";
import { prisma } from "../lib/prisma";
import { CemadenData } from "../types/cemaden-data.type";
import * as XLSX from "xlsx";
import { parseCemadenDate } from "../utils/parse-date";
import { ChuvasAcumuladas } from "../types/chuvas-acumuladas.type";

export class CemadenService {
  async importData(files: AsyncIterableIterator<MultipartFile>): Promise<string> {
    const dataToInsert = [];
    for await (const part of files) {
      if (part.type === "file") {
        const buffer = await part.toBuffer();

        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data: CemadenData[] = XLSX.utils.sheet_to_json(worksheet);

        for (const row of data) {
          dataToInsert.push({
            uf: row["uf"] as string,
            codEstacao: row["codEstacao"] as string,
            nomeEstacao: row["nomeEstacao"] as string,
            dataHora: parseCemadenDate(row["datahora"] as string),
            lat: row["latitude"] as string,
            lon: row["longitude"] as string,
            valorMedida: parseFloat(row["valorMedida"] as string),
          });
        }
      }
    }

    await prisma.dadosCemaden.createMany({
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

  async getChuvasAcumuladas(codEstacao: string): Promise<ChuvasAcumuladas | null> {
    const rows = await prisma.$queryRaw<ChuvasAcumuladas[]>`
      SELECT cod_estacao, snapshot_at,
            chuva_24h, chuva_3d, chuva_7d, chuva_15d, chuva_30d, chuva_45d
      FROM mv_chuvas_acumuladas
      WHERE cod_estacao = ${codEstacao}
      LIMIT 1
    `;

    return rows[0] ?? null;
  }
}

export const cemadenService = new CemadenService();