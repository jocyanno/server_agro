import axios from "axios";
import { CemadenAuthService } from "../../services/cemaden-auth";
import { config } from "../../config/env";
import { CemadenDataRecord } from "../../types/cemaden";
import { prisma } from "../../lib/prisma";

export class CemadenDataService {
  private static readonly DATA_URL =
    "http://sws.cemaden.gov.br/PED/rest/pcds-acum/acumulados-recentes";

  static async fetchAndStoreData(): Promise<void> {
    try {
      const token = await CemadenAuthService.getToken();

      const response = await axios.get<CemadenDataRecord[]>(this.DATA_URL, {
        params: { codibge: config.cemaden.codibge },
        headers: { token }
      });

      if (response.status === 200) {
        const records = response.data;
        await this.processAndStoreData(records);
      } else {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  private static async processAndStoreData(
    records: CemadenDataRecord[]
  ): Promise<void> {
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const configuredStations = config.cemaden.stations.map(s => s.codestacao);
    const filteredRecords = records.filter(record => 
      configuredStations.includes(record.codestacao)
    );

    console.log(`📊 Processando ${filteredRecords.length} registros das estações configuradas de ${records.length} disponíveis`);

    for (const record of filteredRecords) {
      try {
        const existingRecord = await prisma.dadosCemadenStations.findFirst({
          where: {
            codestacao: record.codestacao,
            datahora: new Date(record.datahora)
          }
        }); 

        if (!existingRecord) {
          await prisma.dadosCemadenStations.create({
            data: {
              acc120hr: record.acc120hr,
              acc12hr: record.acc12hr,
              acc1hr: record.acc1hr,
              acc24hr: record.acc24hr,
              acc3hr: record.acc3hr,
              acc48hr: record.acc48hr,
              acc6hr: record.acc6hr,
              acc72hr: record.acc72hr,
              acc96hr: record.acc96hr,
              codestacao: record.codestacao,
              codibge: record.codibge,
              datahora: new Date(record.datahora),
              id_estacao: record.id_estacao
            }
          });
          insertedCount++;
        } else {
          const hasChanged =
            existingRecord.acc120hr !== record.acc120hr ||
            existingRecord.acc12hr !== record.acc12hr ||
            existingRecord.acc1hr !== record.acc1hr ||
            existingRecord.acc24hr !== record.acc24hr ||
            existingRecord.acc3hr !== record.acc3hr ||
            existingRecord.acc48hr !== record.acc48hr ||
            existingRecord.acc6hr !== record.acc6hr ||
            existingRecord.acc72hr !== record.acc72hr ||
            existingRecord.acc96hr !== record.acc96hr ||
            existingRecord.codibge !== record.codibge ||
            existingRecord.id_estacao !== record.id_estacao;

          if (hasChanged) {
            await prisma.dadosCemadenStations.update({
              where: {
                id: existingRecord.id
              },
              data: {
                acc120hr: record.acc120hr,
                acc12hr: record.acc12hr,
                acc1hr: record.acc1hr,
                acc24hr: record.acc24hr,
                acc3hr: record.acc3hr,
                acc48hr: record.acc48hr,
                acc6hr: record.acc6hr,
                acc72hr: record.acc72hr,
                acc96hr: record.acc96hr,
                codibge: record.codibge,
                id_estacao: record.id_estacao
              }
            });
            updatedCount++;
          } else {
            skippedCount++;
          }
        }
      } catch (error) {
      }
    }
  }
}

export async function runCemadenDataCollection(): Promise<void> {
  try {
    await CemadenDataService.fetchAndStoreData();
  } catch (error) {
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runCemadenDataCollection();
}
