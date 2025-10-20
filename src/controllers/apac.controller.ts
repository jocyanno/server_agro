import { FastifyReply, FastifyRequest } from "fastify";
import { ApacService } from "../services/apac.service";


interface PeriodoQuery {
  dataInicio?: string;
  dataFim?: string;
}

export class ApacController {
  private apacService: ApacService;

  constructor() {
    this.apacService = new ApacService();
  }

  async listar(
    request: FastifyRequest<{ Querystring: PeriodoQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { dataInicio, dataFim } = request.query;

      let inicioDate: Date | undefined;
      let fimDate: Date | undefined;

      if (dataInicio) {
        inicioDate = new Date(dataInicio);
        if (isNaN(inicioDate.getTime())) {
          return reply.status(400).send({
            error: "Data de início inválida",
            formato: "YYYY-MM-DD"
          });
        }
      }

      if (dataFim) {
        fimDate = new Date(dataFim);
        if (isNaN(fimDate.getTime())) {
          return reply.status(400).send({
            error: "Data de fim inválida",
            formato: "YYYY-MM-DD"
          });
        }
      }

      if (inicioDate && fimDate && inicioDate > fimDate) {
        return reply
          .status(400)
          .send({ error: "Data de início deve ser anterior à data de fim" });
      }

      const dados = await this.apacService.getDados(inicioDate, fimDate);
      return reply.status(200).send(dados);
    } catch (error) {
      return reply.status(500).send({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  async ultimo(request: FastifyRequest, reply: FastifyReply) {
    try {
      const registro = await this.apacService.getUltimoRegistro();
      if (!registro) {
        return reply
          .status(404)
          .send({ error: "Nenhum registro APAC encontrado" });
      }
      return reply.status(200).send(registro);
    } catch (error) {
      return reply.status(500).send({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  async resumo(
    request: FastifyRequest<{ Querystring: PeriodoQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { dataInicio, dataFim } = request.query;

      let inicioDate: Date | undefined;
      let fimDate: Date | undefined;

      if (dataInicio) {
        inicioDate = new Date(dataInicio);
        if (isNaN(inicioDate.getTime())) {
          return reply.status(400).send({
            error: "Data de início inválida",
            formato: "YYYY-MM-DD"
          });
        }
      }

      if (dataFim) {
        fimDate = new Date(dataFim);
        if (isNaN(fimDate.getTime())) {
          return reply.status(400).send({
            error: "Data de fim inválida",
            formato: "YYYY-MM-DD"
          });
        }
      }

      if (inicioDate && fimDate && inicioDate > fimDate) {
        return reply
          .status(400)
          .send({ error: "Data de início deve ser anterior à data de fim" });
      }

      const dados = await this.apacService.getResumo(inicioDate, fimDate);
      return reply.status(200).send(dados);
    } catch (error) {
      return reply.status(500).send({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  async ultimos5(request: FastifyRequest, reply: FastifyReply) {
    try {
      const registros = await this.apacService.getProximos5Dias();
      return reply.status(200).send({
        total: registros.length,
        registros,
        message: `Retornados ${registros.length} próximos dias de tendência de precipitação (a partir de amanhã)`
      });
    } catch (error) {
      return reply.status(500).send({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }
}
