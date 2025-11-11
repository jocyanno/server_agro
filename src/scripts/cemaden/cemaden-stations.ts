import axios from "axios";
import { prisma } from "../../lib/prisma";
import { CemadenAuthService } from "../../services/cemaden-auth";
import { config } from "../../config/env";
import { EstacaoRecord } from "../../types/cemaden";

export class CemadenStationsService {
  private static readonly STATIONS_URL =
    "http://sws.cemaden.gov.br/PED/rest//pcds-cadastro/estacoes";

  static async fetchAndStoreStations(): Promise<void> {
    try {
      const token = await CemadenAuthService.getToken();

      const response = await axios.get<EstacaoRecord[]>(this.STATIONS_URL, {
        params: { codibge: config.cemaden.codibge },
        headers: { token }
      });

      if (response.status === 200) {
        const stations = response.data;
        await this.processAndStoreStations(stations);
      } else {
        throw new Error(`Failed to fetch stations: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  private static async processAndStoreStations(
    stations: EstacaoRecord[]
  ): Promise<void> {
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Filtrar apenas as estações configuradas
    const configuredStations = config.cemaden.stations.map(s => s.codestacao);
    const filteredStations = stations.filter(station => 
      configuredStations.includes(station.codestacao)
    );

    console.log(`📡 Processando ${filteredStations.length} estações configuradas de ${stations.length} disponíveis`);

    for (const station of filteredStations) {
      try {
        // Check if station already exists
        const existingStation = await prisma.estacoes.findFirst({
          where: {
            codestacao: station.codestacao
          }
        });

        if (!existingStation) {
          // Nova estação - inserir
          await prisma.estacoes.create({
            data: {
              codestacao: station.codestacao,
              id_tipoestacao: station.id_tipoestacao,
              nome: station.nome
            }
          });
          insertedCount++;
        } else {
          // Estação existe - verificar se os dados mudaram
          const hasChanged =
            existingStation.id_tipoestacao !== station.id_tipoestacao ||
            existingStation.nome !== station.nome;

          if (hasChanged) {
            // Dados mudaram - atualizar
            await prisma.estacoes.update({
              where: {
                id: existingStation.id
              },
              data: {
                id_tipoestacao: station.id_tipoestacao,
                nome: station.nome
              }
            });
            updatedCount++;
          } else {
            // Dados não mudaram - pular
            skippedCount++;
          }
        }
      } catch (error) {
        // Error processing station
      }
    }
  }
}

// Function to run the stations collection
export async function runCemadenStationsCollection(): Promise<void> {
  try {
    await CemadenStationsService.fetchAndStoreStations();
  } catch (error) {
    // Error in stations collection
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runCemadenStationsCollection();
}
