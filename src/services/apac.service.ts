import { prisma } from "../lib/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface DadosApacResponse {
  id: number;
  data: Date;
  tendencia: string;
  regiao: string;
  min: number;
  max: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApacListResponse {
  total: number;
  periodo?: {
    inicio: string;
    fim: string;
  };
  dados: DadosApacResponse[];
}

export class ApacService {
  async getDados(dataInicio?: Date, dataFim?: Date): Promise<ApacListResponse> {
    try {
      const where: any = {};

      if (dataInicio || dataFim) {
        where.data = {};
        if (dataInicio) where.data.gte = dataInicio;
        if (dataFim) where.data.lte = dataFim;
      }

      const dados = await prisma.dadosApac.findMany({
        where,
        orderBy: { data: "desc" },
        select: {
          id: true,
          data: true,
          tendencia: true,
          regiao: true,
          min: true,
          max: true,
          createdAt: true,
          updatedAt: true
        }
      });

      const total = await prisma.dadosApac.count({ where });

      const response: ApacListResponse = {
        total,
        dados: dados.map((dado) => ({
          id: dado.id,
          data: dado.data,
          tendencia: dado.tendencia,
          regiao: dado.regiao,
          min: dado.min,
          max: dado.max,
          createdAt: dado.createdAt,
          updatedAt: dado.updatedAt
        }))
      };

      if (dataInicio || dataFim) {
        response.periodo = {
          inicio: dataInicio ? dataInicio.toISOString().split("T")[0] : "",
          fim: dataFim ? dataFim.toISOString().split("T")[0] : ""
        };
      }

      return response;
    } catch (error) {
      throw new Error(
        `Erro ao buscar dados da APAC: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getUltimoRegistro(): Promise<DadosApacResponse | null> {
    try {
      const ultimo = await prisma.dadosApac.findFirst({
        orderBy: { data: "desc" }
      });
      return ultimo as unknown as DadosApacResponse | null;
    } catch (error) {
      throw new Error(
        `Erro ao buscar último registro APAC: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getProximos5Dias(): Promise<DadosApacResponse[]> {
    try {
      console.log("🔍 Buscando próximos 5 dias APAC...");

      // Usar horário de Brasília para calcular "amanhã"
      const agoraBrasilia = dayjs().tz("America/Sao_Paulo");
      const amanhaBrasilia = agoraBrasilia.add(1, "day").startOf("day");
      
      // Converter para Date object para usar no Prisma
      const amanhaDate = amanhaBrasilia.toDate();

      console.log("📅 Data/hora atual (Brasília):", agoraBrasilia.format("DD/MM/YYYY HH:mm:ss"));
      console.log("📅 Amanhã (Brasília):", amanhaBrasilia.format("DD/MM/YYYY HH:mm:ss"));
      console.log("📅 Amanhã (Date para filtro):", amanhaDate.toISOString());

      const registrosFuturos = await prisma.dadosApac.findMany({
        where: {
          data: {
            gte: amanhaDate // Buscar registros de amanhã em diante (horário de Brasília)
          }
        },
        orderBy: [{ data: "asc" }, { id: "desc" }], // Ordenar por data crescente (próximos dias primeiro)
        take: 10 
      });

      console.log(
        "📊 Total de registros futuros encontrados:",
        registrosFuturos.length
      );
      console.log(
        "📅 Primeiros 10 registros futuros:",
        registrosFuturos.slice(0, 10).map((r) => ({
          id: r.id,
          data: r.data.toISOString().split("T")[0],
          hora: r.data.toISOString().split("T")[1]
        }))
      );

      // Agrupar registros por data e pegar o mais recente de cada dia
      const registrosPorData = new Map<string, any>();

      registrosFuturos.forEach((registro) => {
        const dataKey = registro.data.toISOString().split("T")[0]; // YYYY-MM-DD
        const registroExistente = registrosPorData.get(dataKey);

        // Se não existe registro para esta data OU se o registro atual tem ID maior (mais recente)
        if (!registroExistente || registro.id > registroExistente.id) {
          registrosPorData.set(dataKey, registro);
        }
      });

      console.log(
        "🎯 Dias futuros únicos:",
        Array.from(registrosPorData.keys())
      );

      // Converter para array, ordenar por data (crescente) e pegar os 5 primeiros
      const registrosUnicosArray = Array.from(registrosPorData.values())
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()) // Ordenar crescente (próximos dias primeiro)
        .slice(0, 5)
        .map((registro) => registro as unknown as DadosApacResponse);

      console.log(
        "✅ Retornando próximos 5 dias:",
        registrosUnicosArray.map((r) => ({
          id: r.id,
          data: new Date(r.data).toISOString().split("T")[0]
        }))
      );

      return registrosUnicosArray;
    } catch (error) {
      throw new Error(
        `Erro ao buscar próximos 5 dias APAC: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getResumo(
    dataInicio?: Date,
    dataFim?: Date
  ): Promise<{
    total_registros: number;
    primeiro_registro: string | null;
    ultimo_registro: string | null;
    media_min: number;
    media_max: number;
    min_min: number | null;
    max_max: number | null;
    periodo?: { inicio: string; fim: string };
  }> {
    try {
      const where: any = {};
      if (dataInicio || dataFim) {
        where.data = {};
        if (dataInicio) where.data.gte = dataInicio;
        if (dataFim) where.data.lte = dataFim;
      }

      const agg = await prisma.dadosApac.aggregate({
        where,
        _count: { id: true },
        _min: { data: true, min: true },
        _max: { data: true, max: true },
        _avg: { min: true, max: true }
      });

      const response = {
        total_registros: agg._count.id,
        primeiro_registro: agg._min.data
          ? agg._min.data.toISOString().split("T")[0]
          : null,
        ultimo_registro: agg._max.data
          ? agg._max.data.toISOString().split("T")[0]
          : null,
        media_min:
          Math.round(((agg._avg.min as number | null) ?? 0) * 100) / 100,
        media_max:
          Math.round(((agg._avg.max as number | null) ?? 0) * 100) / 100,
        min_min: (agg._min.min as number | null) ?? null,
        max_max: (agg._max.max as number | null) ?? null
      };

      if (dataInicio || dataFim) {
        (response as any).periodo = {
          inicio: dataInicio ? dataInicio.toISOString().split("T")[0] : "",
          fim: dataFim ? dataFim.toISOString().split("T")[0] : ""
        };
      }

      return response;
    } catch (error) {
      throw new Error(
        `Erro ao criar resumo da APAC: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}
