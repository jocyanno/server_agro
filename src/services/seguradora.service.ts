import { prisma } from "../lib/prisma";
import { 
  SeguradoraData, 
  CreateSeguradoraData, 
  UpdateSeguradoraData, 
  SeguradoraFilters 
} from "../types/seguradora.type";

export class SeguradoraService {
  async create(data: CreateSeguradoraData): Promise<SeguradoraData> {
    const seguradora = await (prisma as any).seguradora.create({
      data: {
        ...data,
        documentacaoRecebida: data.documentacaoRecebida 
          ? JSON.stringify(data.documentacaoRecebida) 
          : null,
      },
    });

    return {
      ...seguradora,
      documentacaoRecebida: seguradora.documentacaoRecebida 
        ? JSON.parse(seguradora.documentacaoRecebida) 
        : null,
    };
  }

  async findById(id: string): Promise<SeguradoraData | null> {
    const seguradora = await (prisma as any).seguradora.findUnique({
      where: { id },
    });

    if (!seguradora) return null;

    return {
      ...seguradora,
      documentacaoRecebida: seguradora.documentacaoRecebida 
        ? JSON.parse(seguradora.documentacaoRecebida) 
        : null,
    };
  }

  async findByNumeroOcorrencia(numeroOcorrencia: number): Promise<SeguradoraData | null> {
    const seguradora = await (prisma as any).seguradora.findUnique({
      where: { numeroOcorrencia },
    });

    if (!seguradora) return null;

    return {
      ...seguradora,
      documentacaoRecebida: seguradora.documentacaoRecebida 
        ? JSON.parse(seguradora.documentacaoRecebida) 
        : null,
    };
  }

  async findAll(filters: SeguradoraFilters = {}): Promise<{
    data: SeguradoraData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      numeroOcorrencia,
      tipoEvento,
      status,
      vistoriadorResponsavel,
      dataInicio,
      dataFim,
      page = 1,
      limit = 10,
    } = filters;

    const where: any = {};

    if (numeroOcorrencia) {
      where.numeroOcorrencia = numeroOcorrencia;
    }

    if (tipoEvento) {
      where.tipoEvento = {
        contains: tipoEvento,
        mode: 'insensitive',
      };
    }

    if (status) {
      where.status = status;
    }

    if (vistoriadorResponsavel) {
      where.vistoriadorResponsavel = {
        contains: vistoriadorResponsavel,
        mode: 'insensitive',
      };
    }

    if (dataInicio || dataFim) {
      where.dataHoraRegistro = {};
      if (dataInicio) {
        where.dataHoraRegistro.gte = dataInicio;
      }
      if (dataFim) {
        where.dataHoraRegistro.lte = dataFim;
      }
    }

    const skip = (page - 1) * limit;

    const [seguradoras, total] = await Promise.all([
      (prisma as any).seguradora.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dataHoraRegistro: 'desc' },
      }),
      (prisma as any).seguradora.count({ where }),
    ]);

    const data = seguradoras.map(seguradora => ({
      ...seguradora,
      documentacaoRecebida: seguradora.documentacaoRecebida 
        ? JSON.parse(seguradora.documentacaoRecebida) 
        : null,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: UpdateSeguradoraData): Promise<SeguradoraData | null> {
    const updateData: any = { ...data };
    
    if (data.documentacaoRecebida) {
      updateData.documentacaoRecebida = JSON.stringify(data.documentacaoRecebida);
    }

    const seguradora = await (prisma as any).seguradora.update({
      where: { id },
      data: updateData,
    });

    return {
      ...seguradora,
      documentacaoRecebida: seguradora.documentacaoRecebida 
        ? JSON.parse(seguradora.documentacaoRecebida) 
        : null,
    };
  }

  async delete(id: string): Promise<boolean> {
    try {
      await (prisma as any).seguradora.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      console.error('Erro ao deletar seguradora:', error);
      return false;
    }
  }

  async getStats(): Promise<{
    total: number;
    porStatus: Record<string, number>;
    porTipoEvento: Record<string, number>;
    valorTotalIndenizacoes: number;
  }> {
    const [total, statusStats, tipoEventoStats, valorTotal] = await Promise.all([
      (prisma as any).seguradora.count(),
      (prisma as any).seguradora.groupBy({
        by: ['status'],
        _count: true,
      }),
      (prisma as any).seguradora.groupBy({
        by: ['tipoEvento'],
        _count: true,
      }),
      (prisma as any).seguradora.aggregate({
        _sum: {
          valorIndenizacao: true,
        },
      }),
    ]);

    const porStatus = statusStats.reduce((acc: Record<string, number>, item: any) => {
      acc[item.status || 'Sem status'] = item._count;
      return acc;
    }, {});

    const porTipoEvento = tipoEventoStats.reduce((acc: Record<string, number>, item: any) => {
      acc[item.tipoEvento] = item._count;
      return acc;
    }, {});

    return {
      total,
      porStatus,
      porTipoEvento,
      valorTotalIndenizacoes: valorTotal._sum.valorIndenizacao || 0,
    };
  }
}

export const seguradoraService = new SeguradoraService();
