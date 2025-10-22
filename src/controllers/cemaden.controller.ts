import { FastifyReply, FastifyRequest } from "fastify";
import { cemadenService } from "../services/cemaden.service";

export class CemadenController {
  async import(request: FastifyRequest, reply: FastifyReply) {
    try {
      const files = request.files();

      if (!files) {
        return reply.status(400).send({
          error: "Nenhum arquivo foi enviado"
        });
      }

      const result = await cemadenService.importData(files);

      console.log("Resultado da importação CEMADEN:", result);

      return reply.status(200).send({
        success: true,
        message: 'Importação concluída com sucesso.'
      });
    } catch (error) {
      console.error("Erro no controller import CEMADEN:", error);

      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

  async getChuvasAcumuladas(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { codEstacao } = request.params as { codEstacao: string };
      const { dataInicio, dataFim } = request.query as { 
        dataInicio?: string; 
        dataFim?: string 
      };

      if (!codEstacao) {
        return reply.status(400).send({
          error: "Código da estação é obrigatório"
        });
      }

      const data = await cemadenService.getChuvasAcumuladas(
        codEstacao, 
        dataInicio, 
        dataFim
      );

      return reply.status(200).send({
        success: true,
        data,
        total: data.length
      });
    } catch (error) {
      console.error("Erro no controller getChuvasAcumuladas CEMADEN:", error);

      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

  async cleanCorruptedData(request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await cemadenService.cleanCorruptedData();

      return reply.status(200).send({
        success: true,
        message: result
      });
    } catch (error) {
      console.error("Erro no controller cleanCorruptedData CEMADEN:", error);

      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }
}