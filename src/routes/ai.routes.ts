import { FastifyInstance } from 'fastify';
import { AIController } from '../controllers/ai.controller';

const aiController = new AIController();

export async function aiRoutes(fastify: FastifyInstance): Promise<void> {
  // Schema para análise de dados
  const analyzeSchema = {
    description: 'Analisa dados de chuva e deslizamentos para um período específico',
    summary: 'Analisar dados',
    tags: ['IA'],
    querystring: {
      type: 'object',
      properties: {
        dataInicio: {
          type: 'string',
          format: 'date',
          description: 'Data de início do período (YYYY-MM-DD)',
        },
        dataFim: {
          type: 'string',
          format: 'date',
          description: 'Data de fim do período (YYYY-MM-DD)',
        },
      },
    },
  };

  // Schema para chat com IA
  const chatSchema = {
    description: 'Processa uma pergunta em linguagem natural e retorna resposta inteligente',
    summary: 'Chat com IA',
    tags: ['IA'],
    body: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'Pergunta em linguagem natural',
        },
        period: {
          type: 'object',
          properties: {
            start: {
              type: 'string',
              format: 'date',
              description: 'Data de início do período (YYYY-MM-DD)',
            },
            end: {
              type: 'string',
              format: 'date',
              description: 'Data de fim do período (YYYY-MM-DD)',
            },
          },
        },
      },
      required: ['question'],
    },
  };

  // Schema para estatísticas rápidas
  const quickStatsSchema = {
    description: 'Obtém estatísticas rápidas dos dados mais recentes',
    summary: 'Estatísticas rápidas',
    tags: ['IA'],
  };

  // Schema para primeira data de chuva
  const firstRainfallDateSchema = {
    description: 'Obtém a primeira data de chuva disponível no banco de dados',
    summary: 'Primeira data de chuva',
    tags: ['IA'],
  };

  // Rotas
  fastify.get('/ai/analyze', {
    schema: analyzeSchema,
    handler: aiController.analyze.bind(aiController),
  });

  fastify.post('/ai/chat', {
    schema: chatSchema,
    handler: aiController.chat.bind(aiController),
  });

  fastify.get('/ai/quick-stats', {
    schema: quickStatsSchema,
    handler: aiController.getQuickStats.bind(aiController),
  });

  fastify.get('/ai/first-rainfall-date', {
    schema: firstRainfallDateSchema,
    handler: aiController.getFirstRainfallDate.bind(aiController),
  });
}

