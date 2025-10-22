import { FastifyReply, FastifyRequest } from "fastify";
import { seguradoraService } from "../services/seguradora.service";
import { CreateSeguradoraData, UpdateSeguradoraData, SeguradoraFilters } from "../types/seguradora.type";

export class SeguradoraController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = request.body as CreateSeguradoraData;
      
      // Validações básicas
      if (!data.dataHoraRegistro || !data.tipoEvento || !data.localizacao || !data.descricaoInicial) {
        return reply.status(400).send({
          error: "Campos obrigatórios: dataHoraRegistro, tipoEvento, localizacao, descricaoInicial"
        });
      }

      const seguradora = await seguradoraService.create(data);

      return reply.status(201).send({
        success: true,
        data: seguradora,
        message: "Ocorrência registrada com sucesso"
      });
    } catch (error) {
      console.error("Erro no controller create Seguradora:", error);
      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

  async findById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      if (!id) {
        return reply.status(400).send({
          error: "ID é obrigatório"
        });
      }

      const seguradora = await seguradoraService.findById(id);

      if (!seguradora) {
        return reply.status(404).send({
          error: "Ocorrência não encontrada"
        });
      }

      // Serializar datas para JSON
      const serializedSeguradora = {
        ...seguradora,
        dataHoraRegistro: seguradora.dataHoraRegistro.toISOString(),
        createdAt: seguradora.createdAt?.toISOString(),
        updatedAt: seguradora.updatedAt?.toISOString(),
      };

      return reply.status(200).send({
        success: true,
        data: serializedSeguradora
      });
    } catch (error) {
      console.error("Erro no controller findById Seguradora:", error);
      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

  async findByNumeroOcorrencia(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { numeroOcorrencia } = request.params as { numeroOcorrencia: string };

      if (!numeroOcorrencia) {
        return reply.status(400).send({
          error: "Número da ocorrência é obrigatório"
        });
      }

      const numero = parseInt(numeroOcorrencia);
      if (isNaN(numero)) {
        return reply.status(400).send({
          error: "Número da ocorrência deve ser um número válido"
        });
      }

      const seguradora = await seguradoraService.findByNumeroOcorrencia(numero);

      if (!seguradora) {
        return reply.status(404).send({
          error: "Ocorrência não encontrada"
        });
      }

      return reply.status(200).send({
        success: true,
        data: seguradora
      });
    } catch (error) {
      console.error("Erro no controller findByNumeroOcorrencia Seguradora:", error);
      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

  async findAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      
      const filters: SeguradoraFilters = {
        numeroOcorrencia: query.numeroOcorrencia ? parseInt(query.numeroOcorrencia) : undefined,
        tipoEvento: query.tipoEvento,
        status: query.status,
        vistoriadorResponsavel: query.vistoriadorResponsavel,
        dataInicio: query.dataInicio ? new Date(query.dataInicio) : undefined,
        dataFim: query.dataFim ? new Date(query.dataFim) : undefined,
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 10,
      };

      const result = await seguradoraService.findAll(filters);

      // Serializar manualmente para garantir que os dados sejam enviados corretamente
      const serializedData = result.data.map(item => ({
        id: item.id,
        numeroOcorrencia: item.numeroOcorrencia,
        dataHoraRegistro: item.dataHoraRegistro.toISOString(),
        tipoEvento: item.tipoEvento,
        localizacao: item.localizacao,
        descricaoInicial: item.descricaoInicial,
        status: item.status,
        documentacaoRecebida: item.documentacaoRecebida,
        vistoriadorResponsavel: item.vistoriadorResponsavel,
        conclusaoVistoria: item.conclusaoVistoria,
        valorIndenizacao: item.valorIndenizacao,
        createdAt: item.createdAt?.toISOString(),
        updatedAt: item.updatedAt?.toISOString(),
      }));

      return reply.status(200).send({
        success: true,
        data: serializedData,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      });
    } catch (error) {
      console.error("Erro no controller findAll Seguradora:", error);
      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as UpdateSeguradoraData;

      if (!id) {
        return reply.status(400).send({
          error: "ID é obrigatório"
        });
      }

      const seguradora = await seguradoraService.update(id, data);

      if (!seguradora) {
        return reply.status(404).send({
          error: "Ocorrência não encontrada"
        });
      }

      return reply.status(200).send({
        success: true,
        data: seguradora,
        message: "Ocorrência atualizada com sucesso"
      });
    } catch (error) {
      console.error("Erro no controller update Seguradora:", error);
      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      if (!id) {
        return reply.status(400).send({
          error: "ID é obrigatório"
        });
      }

      const deleted = await seguradoraService.delete(id);

      if (!deleted) {
        return reply.status(404).send({
          error: "Ocorrência não encontrada"
        });
      }

      return reply.status(200).send({
        success: true,
        message: "Ocorrência excluída com sucesso"
      });
    } catch (error) {
      console.error("Erro no controller delete Seguradora:", error);
      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

  async getStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await seguradoraService.getStats();
      
      return reply.status(200).send({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error("Erro no controller getStats Seguradora:", error);
      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

}
