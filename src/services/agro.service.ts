import { prisma } from '../lib/prisma';
import {
  OcorrenciaAgricolaData,
  CreateOcorrenciaAgricolaData,
  UpdateOcorrenciaAgricolaData,
  OcorrenciaAgricolaFilters,
  OcorrenciaAgricolaStats,
} from '../types/agro.type';

export class AgroService {
  async create(
    data: CreateOcorrenciaAgricolaData,
  ): Promise<OcorrenciaAgricolaData> {
    console.log('Criando nova ocorrência agrícola:', data);

    try {
      const ocorrencia = await prisma.ocorrenciaAgricola.create({
        data: {
          ...data,
          statusInicial: data.statusInicial || 'EM_ANALISE',
        },
      });

      console.log('Ocorrência agrícola criada com sucesso:', ocorrencia);
      return ocorrencia;
    } catch (error: any) {
      console.error('Erro ao criar ocorrência agrícola:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  async findMany(filters?: OcorrenciaAgricolaFilters): Promise<{
    data: OcorrenciaAgricolaData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    console.log('Buscando ocorrências agrícolas com filtros:', filters);

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.numeroOcorrencia) {
      where.numeroOcorrencia = filters.numeroOcorrencia;
    }

    if (filters?.produtor) {
      where.produtor = {
        contains: filters.produtor,
        mode: 'insensitive',
      };
    }

    if (filters?.culturaAfetada) {
      where.culturaAfetada = {
        contains: filters.culturaAfetada,
        mode: 'insensitive',
      };
    }

    if (filters?.eventoClimatico) {
      where.eventoClimatico = filters.eventoClimatico;
    }

    if (filters?.statusInicial) {
      where.statusInicial = filters.statusInicial;
    }

    if (filters?.statusFinal) {
      where.statusFinal = filters.statusFinal;
    }

    if (filters?.dataInicio || filters?.dataFim) {
      where.dataInicioEvento = {};
      if (filters.dataInicio) {
        where.dataInicioEvento.gte = filters.dataInicio;
      }
      if (filters.dataFim) {
        where.dataInicioEvento.lte = filters.dataFim;
      }
    }

    try {
      const [ocorrencias, total] = await Promise.all([
        prisma.ocorrenciaAgricola.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            numeroOcorrencia: 'desc',
          },
        }),
        prisma.ocorrenciaAgricola.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      console.log(
        `Encontradas ${ocorrencias.length} ocorrências de ${total} total`,
      );

      return {
        data: ocorrencias,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error: any) {
      console.error('Erro ao buscar ocorrências agrícolas:', error);
      console.error('Stack trace:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      throw error;
    }
  }

  async findById(id: string): Promise<OcorrenciaAgricolaData | null> {
    console.log('Buscando ocorrência agrícola por ID:', id);

    try {
      const ocorrencia = await prisma.ocorrenciaAgricola.findUnique({
        where: { id },
      });

      if (!ocorrencia) {
        console.log('Ocorrência agrícola não encontrada');
        return null;
      }

      console.log('Ocorrência agrícola encontrada:', ocorrencia);
      return ocorrencia;
    } catch (error: any) {
      console.error('Erro ao buscar ocorrência agrícola:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  async findByNumero(numero: number): Promise<OcorrenciaAgricolaData | null> {
    console.log('Buscando ocorrência agrícola por número:', numero);

    try {
      const ocorrencia = await prisma.ocorrenciaAgricola.findUnique({
        where: { numeroOcorrencia: numero },
      });

      if (!ocorrencia) {
        console.log('Ocorrência agrícola não encontrada');
        return null;
      }

      console.log('Ocorrência agrícola encontrada:', ocorrencia);
      return ocorrencia;
    } catch (error: any) {
      console.error('Erro ao buscar ocorrência agrícola:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  async update(
    id: string,
    data: UpdateOcorrenciaAgricolaData,
  ): Promise<OcorrenciaAgricolaData> {
    console.log('Atualizando ocorrência agrícola:', id, data);

    try {
      const ocorrencia = await prisma.ocorrenciaAgricola.update({
        where: { id },
        data,
      });

      console.log('Ocorrência agrícola atualizada com sucesso:', ocorrencia);
      return ocorrencia;
    } catch (error: any) {
      console.error('Erro ao atualizar ocorrência agrícola:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    console.log('Deletando ocorrência agrícola:', id);

    try {
      await prisma.ocorrenciaAgricola.delete({
        where: { id },
      });

      console.log('Ocorrência agrícola deletada com sucesso');
    } catch (error: any) {
      console.error('Erro ao deletar ocorrência agrícola:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  async getStats(): Promise<OcorrenciaAgricolaStats> {
    console.log('Calculando estatísticas das ocorrências agrícolas...');

    try {
      const [
        total,
        statusInicialStats,
        statusFinalStats,
        eventoStats,
        valorTotal,
        areaTotal,
      ] = await Promise.all([
        prisma.ocorrenciaAgricola.count(),
        prisma.ocorrenciaAgricola.groupBy({
          by: ['statusInicial'],
          _count: true,
        }),
        prisma.ocorrenciaAgricola.groupBy({
          by: ['statusFinal'],
          _count: true,
          where: {
            statusFinal: {
              not: null,
            },
          },
        }),
        prisma.ocorrenciaAgricola.groupBy({
          by: ['eventoClimatico'],
          _count: true,
        }),
        prisma.ocorrenciaAgricola.aggregate({
          _sum: {
            valorEstimadoPerda: true,
          },
          where: {
            statusFinal: {
              in: ['SINISTRO_CONFIRMADO', 'INDENIZACAO_PAGA'],
            },
          },
        }),
        prisma.ocorrenciaAgricola.aggregate({
          _sum: {
            areaPlantada: true,
          },
        }),
      ]);

      console.log('Stats - Raw data:', {
        total,
        statusInicialStats,
        statusFinalStats,
        eventoStats,
        valorTotal,
        areaTotal,
      });

      const porStatusInicial = statusInicialStats.reduce(
        (acc: Record<string, number>, item: any) => {
          const count =
            typeof item._count === 'number'
              ? item._count
              : item._count?._all || item._count?.statusInicial || 1;
          console.log(`Status Inicial: ${item.statusInicial} = ${count}`);
          acc[item.statusInicial || 'Sem status'] = count;
          return acc;
        },
        {},
      );

      const porStatusFinal = statusFinalStats.reduce(
        (acc: Record<string, number>, item: any) => {
          const count =
            typeof item._count === 'number'
              ? item._count
              : item._count?._all || item._count?.statusFinal || 1;
          console.log(`Status Final: ${item.statusFinal} = ${count}`);
          acc[item.statusFinal || 'Sem status'] = count;
          return acc;
        },
        {},
      );

      const porEventoClimatico = eventoStats.reduce(
        (acc: Record<string, number>, item: any) => {
          const count =
            typeof item._count === 'number'
              ? item._count
              : item._count?._all || item._count?.eventoClimatico || 1;
          console.log(
            `Evento Climático: ${item.eventoClimatico} = ${count}`,
          );
          acc[item.eventoClimatico] = count;
          return acc;
        },
        {},
      );

      const result = {
        total,
        porStatusInicial,
        porStatusFinal,
        porEventoClimatico,
        valorTotalPerdas: valorTotal._sum.valorEstimadoPerda || 0,
        areaAfetadaTotal: areaTotal._sum.areaPlantada || 0,
      };

      console.log('Stats - Resultado final:', result);

      return result;
    } catch (error: any) {
      console.error('Erro ao calcular estatísticas:', error);
      console.error('Stack trace:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      throw error;
    }
  }
}
