import { FastifyInstance } from 'fastify';
import { CemadenController } from '../controllers/cemaden.controller';

export async function cemadenRoutes(fastify: FastifyInstance): Promise<void> {
  const cemadenController = new CemadenController();

  const getChuvasAcumuladasSchema = {
    description:
      'Obtém as chuvas acumuladas para uma estação específica. Se não informar datas, retorna todos os registros.',
    summary: 'Obter chuvas acumuladas CEMADEN',
    tags: ['CEMADEN'],
    params: {
      type: 'object',
      properties: {
        codEstacao: {
          type: 'string',
          description: 'Código da estação',
        },
      },
      required: ['codEstacao'],
    },
    querystring: {
      type: 'object',
      properties: {
        dataInicio: {
          type: 'string',
          format: 'date-time',
          description:
            'Data e hora de início do período (formato ISO 8601: YYYY-MM-DDTHH:mm:ss)',
        },
        dataFim: {
          type: 'string',
          format: 'date-time',
          description:
            'Data e hora de fim do período (formato ISO 8601: YYYY-MM-DDTHH:mm:ss)',
        },
      },
    },
    response: {
      200: {
        description: 'Dados de chuvas acumuladas',
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          total: { type: 'number' },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                cod_estacao: { type: 'string' },
                snapshot_at: { type: 'string', format: 'date-time' },
                chuva_24h: { type: 'number' },
                chuva_3d: { type: 'number' },
                chuva_7d: { type: 'number' },
                chuva_15d: { type: 'number' },
                chuva_30d: { type: 'number' },
                chuva_45d: { type: 'number' },
              },
            },
          },
        },
      },
      400: {
        description: 'Erro na requisição',
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      500: {
        description: 'Erro interno do servidor',
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  };

  fastify.post(
    '/cemaden/import',
    {},
    cemadenController.import.bind(cemadenController),
  );

  fastify.get(
    '/cemaden/chuvas-acumuladas/:codEstacao',
    {
      schema: getChuvasAcumuladasSchema,
    },
    cemadenController.getChuvasAcumuladas.bind(cemadenController),
  );

  fastify.post(
    '/cemaden/clean-corrupted-data',
    cemadenController.cleanCorruptedData.bind(cemadenController),
  );

  const previsaoChuvaSchema = {
    description:
      'Gera previsão de chuva para o próximo mês baseada em análise histórica avançada',
    summary: 'Previsão de chuva CEMADEN',
    tags: ['CEMADEN', 'Previsão'],
    params: {
      type: 'object',
      properties: {
        codEstacao: {
          type: 'string',
          description: 'Código da estação CEMADEN',
        },
      },
      required: ['codEstacao'],
    },
    response: {
      200: {
        description: 'Previsão gerada com sucesso',
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              probabilidadeChuva: {
                type: 'number',
                description: 'Probabilidade de chuva (%)',
              },
              tendencia: {
                type: 'string',
                enum: ['aumento', 'diminuicao', 'estavel'],
              },
              acuracia: {
                type: 'number',
                description: 'Acurácia do modelo (%)',
              },
              confianca: {
                type: 'number',
                description: 'Nível de confiança (%)',
              },
              mediaHistorica30d: { type: 'number' },
              mediaHistorica45d: { type: 'number' },
              proximoMes: {
                type: 'object',
                properties: {
                  estimativaChuva: { type: 'number' },
                  categoria: { type: 'string' },
                  intervaloConfianca: {
                    type: 'object',
                    properties: {
                      min: { type: 'number' },
                      max: { type: 'number' },
                    },
                  },
                },
              },
              metodologia: {
                type: 'object',
                properties: {
                  algoritmo: { type: 'string' },
                  amostras: { type: 'number' },
                  periodoAnalise: { type: 'string' },
                  factorSazonalidade: { type: 'number' },
                },
              },
            },
          },
          metadata: {
            type: 'object',
            properties: {
              estacao: { type: 'string' },
              timestamp: { type: 'string' },
              versaoModelo: { type: 'string' },
              amostrasUtilizadas: { type: 'number' },
            },
          },
        },
      },
      400: {
        description: 'Erro na requisição',
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      404: {
        description: 'Dados não encontrados',
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      500: {
        description: 'Erro interno do servidor',
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'string' },
        },
      },
    },
  };

  fastify.get(
    '/cemaden/previsao-chuva/:codEstacao',
    {
      schema: previsaoChuvaSchema,
    },
    cemadenController.getPrevisaoChuva.bind(cemadenController),
  );
}
