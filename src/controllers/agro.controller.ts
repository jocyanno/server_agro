import { FastifyRequest, FastifyReply } from 'fastify';
import { AgroService } from '../services/agro.service';
import {
  CreateOcorrenciaAgricolaData,
  UpdateOcorrenciaAgricolaData,
  OcorrenciaAgricolaFilters,
} from '../types/agro.type';

const agroService = new AgroService();

export class AgroController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = request.body as CreateOcorrenciaAgricolaData;

      // Converter strings de data para Date objects
      if (typeof data.dataInicioEvento === 'string') {
        data.dataInicioEvento = new Date(data.dataInicioEvento);
      }
      if (data.dataFimEvento && typeof data.dataFimEvento === 'string') {
        data.dataFimEvento = new Date(data.dataFimEvento);
      }

      const ocorrencia = await agroService.create(data);

      return reply.status(201).send({
        success: true,
        data: ocorrencia,
        message: 'Ocorrência agrícola criada com sucesso',
      });
    } catch (error: any) {
      console.error('❌ Erro no controller ao criar ocorrência:', error);

      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro interno do servidor',
        message: 'Erro ao criar ocorrência agrícola',
      });
    }
  }

  async findMany(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;

      const filters: OcorrenciaAgricolaFilters = {
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 10,
        numeroOcorrencia: query.numeroOcorrencia
          ? parseInt(query.numeroOcorrencia)
          : undefined,
        produtor: query.produtor,
        culturaAfetada: query.culturaAfetada,
        eventoClimatico: query.eventoClimatico,
        statusInicial: query.statusInicial,
        statusFinal: query.statusFinal,
        dataInicio: query.dataInicio ? new Date(query.dataInicio) : undefined,
        dataFim: query.dataFim ? new Date(query.dataFim) : undefined,
      };

      const result = await agroService.findMany(filters);

      return reply.send({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('❌ Erro no controller ao buscar ocorrências:', error);

      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro interno do servidor',
        message: 'Erro ao buscar ocorrências agrícolas',
      });
    }
  }

  async findById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      const ocorrencia = await agroService.findById(id);

      if (!ocorrencia) {
        return reply.status(404).send({
          success: false,
          message: 'Ocorrência agrícola não encontrada',
        });
      }

      return reply.send({
        success: true,
        data: ocorrencia,
      });
    } catch (error: any) {
      console.error(
        '❌ Erro no controller ao buscar ocorrência por ID:',
        error,
      );

      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro interno do servidor',
        message: 'Erro ao buscar ocorrência agrícola',
      });
    }
  }

  async findByNumero(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { numero } = request.params as { numero: string };

      const ocorrencia = await agroService.findByNumero(parseInt(numero));

      if (!ocorrencia) {
        return reply.status(404).send({
          success: false,
          message: 'Ocorrência agrícola não encontrada',
        });
      }

      return reply.send({
        success: true,
        data: ocorrencia,
      });
    } catch (error: any) {
      console.error(
        '❌ Erro no controller ao buscar ocorrência por número:',
        error,
      );

      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro interno do servidor',
        message: 'Erro ao buscar ocorrência agrícola',
      });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as UpdateOcorrenciaAgricolaData;

      // Converter strings de data para Date objects
      if (data.dataInicioEvento && typeof data.dataInicioEvento === 'string') {
        data.dataInicioEvento = new Date(data.dataInicioEvento);
      }
      if (data.dataFimEvento && typeof data.dataFimEvento === 'string') {
        data.dataFimEvento = new Date(data.dataFimEvento);
      }

      const ocorrencia = await agroService.update(id, data);

      return reply.send({
        success: true,
        data: ocorrencia,
        message: 'Ocorrência agrícola atualizada com sucesso',
      });
    } catch (error: any) {
      console.error('❌ Erro no controller ao atualizar ocorrência:', error);

      if (error.code === 'P2025') {
        return reply.status(404).send({
          success: false,
          message: 'Ocorrência agrícola não encontrada',
        });
      }

      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro interno do servidor',
        message: 'Erro ao atualizar ocorrência agrícola',
      });
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      await agroService.delete(id);

      return reply.send({
        success: true,
        message: 'Ocorrência agrícola deletada com sucesso',
      });
    } catch (error: any) {
      console.error('❌ Erro no controller ao deletar ocorrência:', error);

      if (error.code === 'P2025') {
        return reply.status(404).send({
          success: false,
          message: 'Ocorrência agrícola não encontrada',
        });
      }

      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro interno do servidor',
        message: 'Erro ao deletar ocorrência agrícola',
      });
    }
  }

  async getStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('📊 Controller: Iniciando busca de estatísticas do Agro...');
      const stats = await agroService.getStats();
      console.log('✅ Controller: Estatísticas obtidas com sucesso');

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('❌ Erro no controller ao buscar estatísticas:', error);
      console.error('❌ Stack trace:', error.stack);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);

      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro interno do servidor',
        message: 'Erro ao buscar estatísticas',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
}
