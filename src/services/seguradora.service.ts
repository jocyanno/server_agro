import { prisma } from "../lib/prisma";
import { 
  SeguradoraData, 
  CreateSeguradoraData, 
  UpdateSeguradoraData, 
  SeguradoraFilters 
} from "../types/seguradora.type";

export class SeguradoraService {
  async create(data: CreateSeguradoraData): Promise<SeguradoraData> {
    const seguradora = await prisma.seguradora.create({
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
        : undefined,
      vistoriadorResponsavel: seguradora.vistoriadorResponsavel || undefined,
      conclusaoVistoria: seguradora.conclusaoVistoria || undefined,
      valorIndenizacao: seguradora.valorIndenizacao || undefined,
    };
  }

  async findById(id: string): Promise<SeguradoraData | null> {
    const seguradora = await prisma.seguradora.findUnique({
      where: { id },
    });

    if (!seguradora) return null;

    return {
      ...seguradora,
      documentacaoRecebida: seguradora.documentacaoRecebida 
        ? JSON.parse(seguradora.documentacaoRecebida) 
        : undefined,
      vistoriadorResponsavel: seguradora.vistoriadorResponsavel || undefined,
      conclusaoVistoria: seguradora.conclusaoVistoria || undefined,
      valorIndenizacao: seguradora.valorIndenizacao || undefined,
    };
  }

  async findByNumeroOcorrencia(numeroOcorrencia: number): Promise<SeguradoraData | null> {
    const seguradora = await prisma.seguradora.findUnique({
      where: { numeroOcorrencia },
    });

    if (!seguradora) return null;

    return {
      ...seguradora,
      documentacaoRecebida: seguradora.documentacaoRecebida 
        ? JSON.parse(seguradora.documentacaoRecebida) 
        : undefined,
      vistoriadorResponsavel: seguradora.vistoriadorResponsavel || undefined,
      conclusaoVistoria: seguradora.conclusaoVistoria || undefined,
      valorIndenizacao: seguradora.valorIndenizacao || undefined,
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
      prisma.seguradora.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dataHoraRegistro: 'desc' },
      }),
      prisma.seguradora.count({ where }),
    ]);

    const data = seguradoras.map((seguradora) => {
      const processedItem = {
        id: seguradora.id,
        numeroOcorrencia: seguradora.numeroOcorrencia,
        dataHoraRegistro: seguradora.dataHoraRegistro,
        tipoEvento: seguradora.tipoEvento,
        localizacao: seguradora.localizacao,
        descricaoInicial: seguradora.descricaoInicial,
        status: seguradora.status,
        documentacaoRecebida: seguradora.documentacaoRecebida 
          ? JSON.parse(seguradora.documentacaoRecebida) 
          : undefined,
        vistoriadorResponsavel: seguradora.vistoriadorResponsavel || undefined,
        conclusaoVistoria: seguradora.conclusaoVistoria || undefined,
        valorIndenizacao: seguradora.valorIndenizacao || undefined,
        createdAt: seguradora.createdAt,
        updatedAt: seguradora.updatedAt,
      };
      
      return processedItem;
    });

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

    const seguradora = await prisma.seguradora.update({
      where: { id },
      data: updateData,
    });

    return {
      ...seguradora,
      documentacaoRecebida: seguradora.documentacaoRecebida 
        ? JSON.parse(seguradora.documentacaoRecebida) 
        : undefined,
      vistoriadorResponsavel: seguradora.vistoriadorResponsavel || undefined,
      conclusaoVistoria: seguradora.conclusaoVistoria || undefined,
      valorIndenizacao: seguradora.valorIndenizacao || undefined,
    };
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.seguradora.delete({
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

    console.log('📊 Stats - Raw data:', { total, statusStats, tipoEventoStats, valorTotal });
    console.log('📊 Stats - statusStats detalhado:', JSON.stringify(statusStats, null, 2));
    console.log('📊 Stats - tipoEventoStats detalhado:', JSON.stringify(tipoEventoStats, null, 2));

    const porStatus = statusStats.reduce((acc: Record<string, number>, item: any) => {
      // O Prisma retorna _count como um número direto quando usando groupBy
      const count = typeof item._count === 'number' ? item._count : (item._count?._all || item._count?.status || 1);
      console.log(`📊 Status: ${item.status} = ${count}`);
      acc[item.status || 'Sem status'] = count;
      return acc;
    }, {});

    const porTipoEvento = tipoEventoStats.reduce((acc: Record<string, number>, item: any) => {
      // O Prisma retorna _count como um número direto quando usando groupBy
      const count = typeof item._count === 'number' ? item._count : (item._count?._all || item._count?.tipoEvento || 1);
      console.log(`📊 Tipo Evento: ${item.tipoEvento} = ${count}`);
      acc[item.tipoEvento] = count;
      return acc;
    }, {});

    const result = {
      total,
      porStatus,
      porTipoEvento,
      valorTotalIndenizacoes: valorTotal._sum.valorIndenizacao || 0,
    };

    console.log('📊 Stats - Resultado final:', result);

    return result;
  }
}

export const seguradoraService = new SeguradoraService();
