import { FastifyReply, FastifyRequest } from 'fastify';
import { cemadenService } from '../services/cemaden.service';
import { ModeloPrevisaoChuva } from '../services/previsao-chuva.service';

export class CemadenController {
  async import(request: FastifyRequest, reply: FastifyReply) {
    try {
      const files = request.files();

      if (!files) {
        return reply.status(400).send({
          error: 'Nenhum arquivo foi enviado',
        });
      }

      const result = await cemadenService.importData(files);

      console.log('Resultado da importação CEMADEN:', result);

      return reply.status(200).send({
        success: true,
        message: 'Importação concluída com sucesso.',
      });
    } catch (error) {
      console.error('Erro no controller import CEMADEN:', error);

      return reply.status(500).send({
        error: 'Erro interno do servidor',
      });
    }
  }

  async getChuvasAcumuladas(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { codEstacao } = request.params as { codEstacao: string };
      const { dataInicio, dataFim } = request.query as {
        dataInicio?: string;
        dataFim?: string;
      };

      if (!codEstacao) {
        return reply.status(400).send({
          error: 'Código da estação é obrigatório',
        });
      }

      const data = await cemadenService.getChuvasAcumuladas(
        codEstacao,
        dataInicio,
        dataFim,
      );

      return reply.status(200).send({
        success: true,
        data,
        total: data.length,
      });
    } catch (error) {
      console.error('Erro no controller getChuvasAcumuladas CEMADEN:', error);

      return reply.status(500).send({
        error: 'Erro interno do servidor',
      });
    }
  }

  async cleanCorruptedData(request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await cemadenService.cleanCorruptedData();

      return reply.status(200).send({
        success: true,
        message: result,
      });
    } catch (error) {
      console.error('Erro no controller cleanCorruptedData CEMADEN:', error);

      return reply.status(500).send({
        error: 'Erro interno do servidor',
      });
    }
  }

  async getPrevisaoChuva(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { codEstacao } = request.params as { codEstacao: string };

      if (!codEstacao) {
        return reply.status(400).send({
          error: 'Código da estação é obrigatório',
        });
      }

      console.log(`Gerando previsão de chuva para estação: ${codEstacao}`);

      // Buscar TODA a base de dados históricos disponível no banco
      console.log('📊 Buscando TODA a base de dados históricos disponível...');
      const dadosHistoricos = await cemadenService.getChuvasAcumuladas(
        codEstacao,
        // SEM parâmetros de data - usa toda a base histórica disponível
      );

      if (!dadosHistoricos || dadosHistoricos.length === 0) {
        return reply.status(404).send({
          error: 'Dados históricos não encontrados para esta estação',
        });
      }

      // Gerar previsão usando o modelo avançado
      const previsao = ModeloPrevisaoChuva.calcularPrevisao(dadosHistoricos);

      console.log(
        `Previsão gerada: acurácia ${previsao.acuracia}%, confiança ${previsao.confianca}%`,
      );

      return reply.status(200).send({
        success: true,
        data: previsao,
        metadata: {
          estacao: codEstacao,
          timestamp: new Date().toISOString(),
          versaoModelo: '2.0.0',
          amostrasUtilizadas: dadosHistoricos.length,
        },
      });
    } catch (error) {
      console.error('Erro ao gerar previsão de chuva:', error);
      return reply.status(500).send({
        error: 'Erro interno do servidor ao gerar previsão',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  async getStationsWithData(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stations = await cemadenService.getStationsWithData();

      return reply.status(200).send({
        success: true,
        total: stations.length,
        stations,
      });
    } catch (error) {
      console.error('Erro no controller getStationsWithData CEMADEN:', error);

      return reply.status(500).send({
        error: 'Erro interno do servidor',
      });
    }
  }
}
