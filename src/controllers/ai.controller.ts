import { FastifyRequest, FastifyReply } from 'fastify';
import { AIService } from '../services/ai.service';

const aiService = new AIService();

export class AIController {
  async analyze(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { dataInicio, dataFim } = request.query as {
        dataInicio?: string;
        dataFim?: string;
      };

      console.log('Iniciando análise de dados:', { dataInicio, dataFim });

      const result = await aiService.analyzeData(dataInicio, dataFim);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Erro ao analisar dados:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao processar análise de dados',
        details:
          error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  async chat(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { question, period } = request.body as {
        question: string;
        period?: { start: string; end: string };
      };

      if (!question || !question.trim()) {
        return reply.status(400).send({
          success: false,
          error: 'Pergunta é obrigatória',
        });
      }

      console.log('Processando pergunta:', question);

      const answer = await aiService.processQuestion(question, period);

      return reply.status(200).send({
        success: true,
        data: {
          answer,
          question,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Erro ao processar pergunta:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao processar pergunta',
        details:
          error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  async getQuickStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('Obtendo estatísticas rápidas...');

      const stats = await aiService.getQuickStats();

      return reply.status(200).send({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas rápidas:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao obter estatísticas rápidas',
        details:
          error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  async getFirstRainfallDate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { prisma } = await import('../lib/prisma');

      const result = await prisma.$queryRawUnsafe<Array<{ min_data: Date }>>(
        `SELECT MIN(data) as min_data FROM dados_cemaden WHERE data IS NOT NULL`,
      );

      const firstDateCemaden = result[0]?.min_data;
      console.log('Primeira data de dados_cemaden:', firstDateCemaden);

      const resultStations = await prisma.$queryRawUnsafe<Array<{ min_data: Date }>>(
        `SELECT MIN(datahora) as min_data FROM dados_cemaden_stations WHERE datahora IS NOT NULL`,
      );

      const firstDateStations = resultStations[0]?.min_data;
      console.log('Primeira data de dados_cemaden_stations:', firstDateStations);

      let firstDate: Date | null = null;

      if (firstDateCemaden && firstDateStations) {
        firstDate = firstDateCemaden < firstDateStations ? firstDateCemaden : firstDateStations;
        console.log('Comparando datas - Cemaden:', firstDateCemaden, 'Stations:', firstDateStations);
      } else if (firstDateCemaden) {
        firstDate = firstDateCemaden;
      } else if (firstDateStations) {
        firstDate = firstDateStations;
      }

      if (!firstDate) {
        console.log('Nenhuma data encontrada em ambas as tabelas');
        return reply.status(404).send({
          success: false,
          error: 'Nenhum dado de chuva encontrado',
        });
      }

      const firstDateString = firstDate.toISOString().split('T')[0];
      console.log('Primeira data final encontrada:', firstDateString);

      return reply.status(200).send({
        success: true,
        data: {
          firstDate: firstDateString,
        },
      });
    } catch (error) {
      console.error('Erro ao obter primeira data:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao obter primeira data de chuva',
        details:
          error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
}

