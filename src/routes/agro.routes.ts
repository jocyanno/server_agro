import { FastifyInstance } from 'fastify';
import { AgroController } from '../controllers/agro.controller';

const agroController = new AgroController();

export async function agroRoutes(fastify: FastifyInstance): Promise<void> {
  // Schema para criação - apenas validação de entrada
  const createSchema = {
    description: 'Cria uma nova ocorrência agrícola',
    summary: 'Criar ocorrência agrícola',
    tags: ['Agro'],
    body: {
      type: 'object',
      properties: {
        produtor: {
          type: 'string',
          description: 'Nome do produtor',
        },
        codigoPropriedade: {
          type: 'string',
          description: 'Código da propriedade',
        },
        culturaAfetada: {
          type: 'string',
          description: 'Cultura afetada',
        },
        areaPlantada: {
          type: 'number',
          description: 'Área plantada em hectares',
        },
        eventoClimatico: {
          type: 'string',
          enum: [
            'EXCESSO_CHUVA',
            'SECA',
            'GRANIZO',
            'GEADA',
            'VENDAVAL',
            'INCENDIO',
            'PRAGA',
            'DOENCA',
          ],
          description: 'Tipo do evento climático',
        },
        dataInicioEvento: {
          type: 'string',
          format: 'date-time',
          description: 'Data de início do evento',
        },
        dataFimEvento: {
          type: 'string',
          format: 'date-time',
          description: 'Data de fim do evento',
        },
        descricaoDano: {
          type: 'string',
          description: 'Descrição do dano',
        },
        percentualPerda: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
          description: 'Percentual de perda estimado',
        },
        statusInicial: {
          type: 'string',
          enum: ['EM_ANALISE', 'VISTORIA_AGENDADA', 'VISTORIA_REALIZADA'],
          description: 'Status inicial da ocorrência',
        },
        statusFinal: {
          type: 'string',
          enum: [
            'SINISTRO_CONFIRMADO',
            'NAO_COBERTO',
            'INDENIZACAO_PAGA',
            'ARQUIVADO',
          ],
          description: 'Status final da ocorrência',
        },
        valorEstimadoPerda: {
          type: 'number',
          description: 'Valor estimado da perda',
        },
      },
      required: [
        'produtor',
        'codigoPropriedade',
        'culturaAfetada',
        'areaPlantada',
        'eventoClimatico',
        'dataInicioEvento',
        'descricaoDano',
        'percentualPerda',
        'valorEstimadoPerda',
      ],
    },
  };

  // Schema para busca por ID - apenas validação de entrada
  const findByIdSchema = {
    description: 'Busca uma ocorrência agrícola por ID',
    summary: 'Buscar por ID',
    tags: ['Agro'],
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID da ocorrência',
        },
      },
      required: ['id'],
    },
  };

  // Schema para busca por número da ocorrência - apenas validação de entrada
  const findByNumeroSchema = {
    description: 'Busca uma ocorrência agrícola por número',
    summary: 'Buscar por número da ocorrência',
    tags: ['Agro'],
    params: {
      type: 'object',
      properties: {
        numero: {
          type: 'string',
          description: 'Número da ocorrência',
        },
      },
      required: ['numero'],
    },
  };

  // Schema para listagem - apenas validação de entrada
  const listSchema = {
    description: 'Lista ocorrências agrícolas com filtros opcionais',
    summary: 'Listar ocorrências agrícolas',
    tags: ['Agro'],
    querystring: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          description: 'Número da página (padrão: 1)',
        },
        limit: {
          type: 'string',
          description: 'Limite por página (padrão: 10)',
        },
        numeroOcorrencia: {
          type: 'string',
          description: 'Número da ocorrência',
        },
        produtor: {
          type: 'string',
          description: 'Nome do produtor',
        },
        culturaAfetada: {
          type: 'string',
          description: 'Cultura afetada',
        },
        eventoClimatico: {
          type: 'string',
          description: 'Tipo do evento climático',
        },
        statusInicial: {
          type: 'string',
          description: 'Status inicial',
        },
        statusFinal: {
          type: 'string',
          description: 'Status final',
        },
        dataInicio: {
          type: 'string',
          format: 'date',
          description: 'Data início do filtro',
        },
        dataFim: {
          type: 'string',
          format: 'date',
          description: 'Data fim do filtro',
        },
      },
    },
  };

  // Schema para atualização - apenas validação de entrada
  const updateSchema = {
    description: 'Atualiza uma ocorrência agrícola',
    summary: 'Atualizar ocorrência agrícola',
    tags: ['Agro'],
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID da ocorrência',
        },
      },
      required: ['id'],
    },
    body: {
      type: 'object',
      properties: {
        produtor: {
          type: 'string',
          description: 'Nome do produtor',
        },
        codigoPropriedade: {
          type: 'string',
          description: 'Código da propriedade',
        },
        culturaAfetada: {
          type: 'string',
          description: 'Cultura afetada',
        },
        areaPlantada: {
          type: 'number',
          description: 'Área plantada em hectares',
        },
        eventoClimatico: {
          type: 'string',
          enum: [
            'EXCESSO_CHUVA',
            'SECA',
            'GRANIZO',
            'GEADA',
            'VENDAVAL',
            'INCENDIO',
            'PRAGA',
            'DOENCA',
          ],
          description: 'Tipo do evento climático',
        },
        dataInicioEvento: {
          type: 'string',
          format: 'date-time',
          description: 'Data de início do evento',
        },
        dataFimEvento: {
          type: 'string',
          format: 'date-time',
          description: 'Data de fim do evento',
        },
        descricaoDano: {
          type: 'string',
          description: 'Descrição do dano',
        },
        percentualPerda: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
          description: 'Percentual de perda estimado',
        },
        statusInicial: {
          type: 'string',
          enum: ['EM_ANALISE', 'VISTORIA_AGENDADA', 'VISTORIA_REALIZADA'],
          description: 'Status inicial da ocorrência',
        },
        statusFinal: {
          type: 'string',
          enum: [
            'SINISTRO_CONFIRMADO',
            'NAO_COBERTO',
            'INDENIZACAO_PAGA',
            'ARQUIVADO',
          ],
          description: 'Status final da ocorrência',
        },
        valorEstimadoPerda: {
          type: 'number',
          description: 'Valor estimado da perda',
        },
      },
    },
  };

  // Schema para exclusão - apenas validação de entrada
  const deleteSchema = {
    description: 'Exclui uma ocorrência agrícola',
    summary: 'Excluir ocorrência agrícola',
    tags: ['Agro'],
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID da ocorrência',
        },
      },
      required: ['id'],
    },
  };

  // Rotas
  fastify.post('/agro', {
    schema: createSchema,
    handler: agroController.create.bind(agroController),
  });

  fastify.get('/agro', {
    schema: listSchema,
    handler: agroController.findMany.bind(agroController),
  });

  fastify.get(
    '/agro/stats/overview',
    agroController.getStats.bind(agroController),
  );

  fastify.get('/agro/:id', {
    schema: findByIdSchema,
    handler: agroController.findById.bind(agroController),
  });

  fastify.get('/agro/numero/:numero', {
    schema: findByNumeroSchema,
    handler: agroController.findByNumero.bind(agroController),
  });

  fastify.put('/agro/:id', {
    schema: updateSchema,
    handler: agroController.update.bind(agroController),
  });

  fastify.delete('/agro/:id', {
    schema: deleteSchema,
    handler: agroController.delete.bind(agroController),
  });
}
