import { FastifyInstance } from "fastify";
import { SeguradoraController } from "../controllers/seguradora.controller";

export async function seguradoraRoutes(fastify: FastifyInstance): Promise<void> {
  const seguradoraController = new SeguradoraController();

  // Schema para criação - apenas validação de entrada
  const createSeguradoraSchema = {
    description: "Cria uma nova ocorrência de seguradora",
    summary: "Criar ocorrência",
    tags: ["Seguradora"],
    body: {
      type: "object",
      required: ["dataHoraRegistro", "tipoEvento", "localizacao", "descricaoInicial"],
      properties: {
        dataHoraRegistro: {
          type: "string",
          format: "date-time",
          description: "Data e hora do registro da ocorrência"
        },
        tipoEvento: {
          type: "string",
          description: "Tipo do evento (ex: Alagamento, Deslizamento, Vendaval)"
        },
        localizacao: {
          type: "string",
          description: "Endereço ou coordenadas do local"
        },
        descricaoInicial: {
          type: "string",
          description: "Descrição inicial do ocorrido"
        },
        status: {
          type: "string",
          enum: ["EM_ANALISE", "VISTORIA_AGENDADA", "VISTORIA_REALIZADA", "SINISTRO_CONFIRMADO", "SINISTRO_NAO_CONFIRMADO", "INDENIZACAO_PAGA", "ARQUIVADO"],
          description: "Status da ocorrência",
          default: "EM_ANALISE"
        },
        documentacaoRecebida: {
          type: "array",
          items: { type: "string" },
          description: "Lista de arquivos de documentação"
        },
        vistoriadorResponsavel: {
          type: "string",
          description: "Nome do vistoriador responsável"
        },
        conclusaoVistoria: {
          type: "string",
          description: "Conclusão da vistoria"
        },
        valorIndenizacao: {
          type: "number",
          description: "Valor da indenização"
        }
      }
    }
    // Removendo response schema para evitar perda de dados
  };

  // Schema para busca por ID - apenas validação de entrada
  const findByIdSchema = {
    description: "Busca uma ocorrência por ID",
    summary: "Buscar por ID",
    tags: ["Seguradora"],
    params: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID da ocorrência"
        }
      },
      required: ["id"]
    }
    // Removendo response schema para evitar perda de dados
  };

  // Schema para busca por número da ocorrência - apenas validação de entrada
  const findByNumeroSchema = {
    description: "Busca uma ocorrência por número",
    summary: "Buscar por número da ocorrência",
    tags: ["Seguradora"],
    params: {
      type: "object",
      properties: {
        numeroOcorrencia: {
          type: "string",
          description: "Número da ocorrência"
        }
      },
      required: ["numeroOcorrencia"]
    }
    // Removendo response schema para evitar perda de dados
  };

  // Schema para listagem com filtros - apenas validação de entrada
  const findAllSchema = {
    description: "Lista ocorrências com filtros opcionais",
    summary: "Listar ocorrências",
    tags: ["Seguradora"],
    querystring: {
      type: "object",
      properties: {
        numeroOcorrencia: {
          type: "string",
          description: "Número da ocorrência"
        },
        tipoEvento: {
          type: "string",
          description: "Tipo do evento"
        },
        status: {
          type: ["string", "null"],
          enum: ["EM_ANALISE", "VISTORIA_AGENDADA", "VISTORIA_REALIZADA", "SINISTRO_CONFIRMADO", "SINISTRO_NAO_CONFIRMADO", "INDENIZACAO_PAGA", "ARQUIVADO", null, ""],
          description: "Status da ocorrência"
        },
        vistoriadorResponsavel: {
          type: "string",
          description: "Vistoriador responsável"
        },
        dataInicio: {
          type: "string",
          format: "date-time",
          description: "Data de início do filtro"
        },
        dataFim: {
          type: "string",
          format: "date-time",
          description: "Data de fim do filtro"
        },
        page: {
          type: "string",
          description: "Página (padrão: 1)"
        },
        limit: {
          type: "string",
          description: "Limite por página (padrão: 10)"
        }
      }
    }
    // Removendo response schema para evitar perda de dados
  };

  // Schema para atualização - apenas validação de entrada
  const updateSchema = {
    description: "Atualiza uma ocorrência",
    summary: "Atualizar ocorrência",
    tags: ["Seguradora"],
    params: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID da ocorrência"
        }
      },
      required: ["id"]
    },
    body: {
      type: "object",
      properties: {
        dataHoraRegistro: {
          type: "string",
          format: "date-time",
          description: "Data e hora do registro"
        },
        tipoEvento: {
          type: "string",
          description: "Tipo do evento"
        },
        localizacao: {
          type: "string",
          description: "Localização"
        },
        descricaoInicial: {
          type: "string",
          description: "Descrição inicial"
        },
        status: {
          type: "string",
          enum: ["EM_ANALISE", "VISTORIA_AGENDADA", "VISTORIA_REALIZADA", "SINISTRO_CONFIRMADO", "SINISTRO_NAO_CONFIRMADO", "INDENIZACAO_PAGA", "ARQUIVADO"],
          description: "Status da ocorrência"
        },
        documentacaoRecebida: {
          type: "array",
          items: { type: "string" },
          description: "Documentação recebida"
        },
        vistoriadorResponsavel: {
          type: "string",
          description: "Vistoriador responsável"
        },
        conclusaoVistoria: {
          type: "string",
          description: "Conclusão da vistoria"
        },
        valorIndenizacao: {
          type: "number",
          description: "Valor da indenização"
        }
      }
    }
    // Removendo response schema para evitar perda de dados
  };

  // Schema para exclusão - apenas validação de entrada
  const deleteSchema = {
    description: "Exclui uma ocorrência",
    summary: "Excluir ocorrência",
    tags: ["Seguradora"],
    params: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID da ocorrência"
        }
      },
      required: ["id"]
    }
    // Removendo response schema para evitar perda de dados
  };

  // Schema para estatísticas removido - causava perda de dados

  // Rotas
  fastify.post("/seguradora", {
    schema: createSeguradoraSchema
  }, seguradoraController.create.bind(seguradoraController));

  fastify.get("/seguradora/:id", {
    schema: findByIdSchema
  }, seguradoraController.findById.bind(seguradoraController));

  fastify.get("/seguradora/numero/:numeroOcorrencia", {
    schema: findByNumeroSchema
  }, seguradoraController.findByNumeroOcorrencia.bind(seguradoraController));

  fastify.get("/seguradora", {
    schema: findAllSchema
  }, seguradoraController.findAll.bind(seguradoraController));

  fastify.put("/seguradora/:id", {
    schema: updateSchema
  }, seguradoraController.update.bind(seguradoraController));

  fastify.delete("/seguradora/:id", {
    schema: deleteSchema
  }, seguradoraController.delete.bind(seguradoraController));

  fastify.get("/seguradora/stats/overview", {
    // Sem schema para evitar perda de dados nas estatísticas
  }, seguradoraController.getStats.bind(seguradoraController));
}
