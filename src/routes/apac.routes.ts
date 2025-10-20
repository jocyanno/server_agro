import { FastifyInstance } from "fastify";
import { ApacController } from "../controllers/apac.controller";

export async function apacRoutes(app: FastifyInstance): Promise<void> {
  const apacController = new ApacController();

  // Listar dados APAC (com período opcional)
  app.get(
    "/apac",
    {
      schema: {
        description:
          "Lista dados meteorológicos da APAC com filtro opcional por período",
        summary: "Listar dados APAC",
        tags: ["APAC"],
        querystring: {
          type: "object",
          properties: {
            dataInicio: {
              type: "string",
              description: "Data de início no formato YYYY-MM-DD (opcional)",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$"
            },
            dataFim: {
              type: "string",
              description: "Data de fim no formato YYYY-MM-DD (opcional)",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$"
            }
          }
        },
        response: {
          200: {
            description: "Lista de dados da APAC",
            type: "object",
            properties: {
              total: { type: "number" },
              periodo: {
                type: "object",
                nullable: true,
                properties: {
                  inicio: { type: "string" },
                  fim: { type: "string" }
                }
              },
              dados: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    data: { type: "string" },
                    regiao: { type: "string" },
                    tendencia: { type: "string" },
                    min: { type: "number" },
                    max: { type: "number" },
                    createdAt: { type: "string" },
                    updatedAt: { type: "string" }
                  },
                  required: [
                    "id",
                    "data",
                    "regiao",
                    "tendencia",
                    "min",
                    "max",
                    "createdAt",
                    "updatedAt"
                  ]
                }
              }
            },
            required: ["total", "dados"]
          }
        }
      }
    },
    apacController.listar.bind(apacController)
  );

  // Último registro APAC
  app.get(
    "/apac/ultimo",
    {
      schema: {
        description: "Obtém o último registro disponível da APAC",
        summary: "Último registro APAC",
        tags: ["APAC"],
        response: {
          200: {
            description: "Último registro APAC",
            type: "object",
            properties: {
              id: { type: "number" },
              data: { type: "string" },
              regiao: { type: "string" },
              tendencia: { type: "string" },
              min: { type: "number" },
              max: { type: "number" },
              createdAt: { type: "string" },
              updatedAt: { type: "string" }
            },
            required: [
              "id",
              "data",
              "regiao",
              "tendencia",
              "min",
              "max",
              "createdAt",
              "updatedAt"
            ]
          },
          404: {
            description: "Nenhum registro encontrado",
            type: "object",
            properties: {
              error: { type: "string" }
            }
          }
        }
      }
    },
    apacController.ultimo.bind(apacController)
  );

  // Resumo APAC
  app.get(
    "/apac/resumo",
    {
      schema: {
        description:
          "Obtém resumo estatístico dos dados da APAC, com filtro opcional por período",
        summary: "Resumo APAC",
        tags: ["APAC"],
        querystring: {
          type: "object",
          properties: {
            dataInicio: {
              type: "string",
              description: "Data de início no formato YYYY-MM-DD (opcional)",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$"
            },
            dataFim: {
              type: "string",
              description: "Data de fim no formato YYYY-MM-DD (opcional)",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$"
            }
          }
        },
        response: {
          200: {
            description: "Resumo estatístico APAC",
            type: "object",
            properties: {
              total_registros: { type: "number" },
              primeiro_registro: { type: "string", nullable: true },
              ultimo_registro: { type: "string", nullable: true },
              media_min: { type: "number" },
              media_max: { type: "number" },
              min_min: { type: "number", nullable: true },
              max_max: { type: "number", nullable: true },
              periodo: {
                type: "object",
                nullable: true,
                properties: {
                  inicio: { type: "string" },
                  fim: { type: "string" }
                }
              }
            },
            required: [
              "total_registros",
              "primeiro_registro",
              "ultimo_registro",
              "media_min",
              "media_max",
              "min_min",
              "max_max"
            ]
          }
        }
      }
    },
    apacController.resumo.bind(apacController)
  );

  // Próximos 5 dias APAC
  app.get(
    "/apac/ultimos-5",
    {
      schema: {
        description:
          "Obtém os próximos 5 dias de tendência da APAC (dias futuros a partir de amanhã)",
        summary: "Próximos 5 dias APAC",
        tags: ["APAC"],
        response: {
          200: {
            description: "Lista dos últimos 5 registros APAC",
            type: "object",
            properties: {
              total: { type: "number" },
              registros: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    data: { type: "string" },
                    regiao: { type: "string" },
                    tendencia: { type: "string" },
                    min: { type: "number" },
                    max: { type: "number" },
                    createdAt: { type: "string" },
                    updatedAt: { type: "string" }
                  },
                  required: [
                    "id",
                    "data",
                    "regiao",
                    "tendencia",
                    "min",
                    "max",
                    "createdAt",
                    "updatedAt"
                  ]
                }
              }
            },
            required: ["total", "registros"]
          }
        }
      }
    },
    apacController.ultimos5.bind(apacController)
  );
}
