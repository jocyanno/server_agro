import { prisma } from "../lib/prisma";

export interface CemadenDataResponse {
  id: number;
  acc120hr: number | null;
  acc12hr: number | null;
  acc1hr: number | null;
  acc24hr: number | null;
  acc3hr: number | null;
  acc48hr: number | null;
  acc6hr: number | null;
  acc72hr: number | null;
  acc96hr: number | null;
  codestacao: string;
  codibge: number;
  datahora: Date;
  id_estacao: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StationInfo {
  id: number;
  codestacao: string;
  id_tipoestacao: number;
  nome: string;
  createdAt: Date;
}

export class CemadenService {
  async getLatestDataByStation(
    codestacao: string
  ): Promise<CemadenDataResponse | null> {
    try {
      const latestData = await prisma.dadosCemaden.findFirst({
        where: {
          codestacao: codestacao
        },
        orderBy: {
          datahora: "desc"
        }
      });

      return latestData;
    } catch (error) {
      throw new Error(
        `Erro ao buscar dados da estação ${codestacao}: ${error}`
      );
    }
  }

  async getAllStations(): Promise<StationInfo[]> {
    try {
      const stations = await prisma.estacoes.findMany({
        orderBy: {
          nome: "asc"
        }
      });

      return stations;
    } catch (error) {
      throw new Error(`Erro ao buscar estações: ${error}`);
    }
  }

  async getStationInfo(codestacao: string): Promise<StationInfo | null> {
    try {
      const station = await prisma.estacoes.findFirst({
        where: {
          codestacao: codestacao
        }
      });

      return station;
    } catch (error) {
      throw new Error(
        `Erro ao buscar informações da estação ${codestacao}: ${error}`
      );
    }
  }

  async getAllStationsWithLatestData(): Promise<any[]> {
    try {
      // Buscar todas as estações
      const stations = await prisma.estacoes.findMany({
        orderBy: {
          nome: "asc"
        }
      });

      // Para cada estação, buscar o último registro de dados
      const stationsWithData = await Promise.all(
        stations.map(async (station) => {
          const latestData = await prisma.dadosCemaden.findFirst({
            where: {
              codestacao: station.codestacao
            },
            orderBy: {
              datahora: "desc"
            }
          });

          return {
            station: {
              codigo: station.codestacao,
              nome: station.nome,
              tipo: station.id_tipoestacao
            },
            data: latestData
              ? {
                  datahora: latestData.datahora,
                  precipitacao: {
                    acc1hr: latestData.acc1hr,
                    acc3hr: latestData.acc3hr,
                    acc6hr: latestData.acc6hr,
                    acc12hr: latestData.acc12hr,
                    acc24hr: latestData.acc24hr,
                    acc48hr: latestData.acc48hr,
                    acc72hr: latestData.acc72hr,
                    acc96hr: latestData.acc96hr,
                    acc120hr: latestData.acc120hr
                  },
                  codibge: latestData.codibge,
                  id_estacao: latestData.id_estacao
                }
              : null
          };
        })
      );

      return stationsWithData;
    } catch (error) {
      throw new Error(`Erro ao buscar estações com dados: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}
