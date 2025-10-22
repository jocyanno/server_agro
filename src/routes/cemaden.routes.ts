import { FastifyInstance } from "fastify";
import { CemadenController } from "../controllers/cemaden.controller";

export async function cemadenRoutes(fastify: FastifyInstance): Promise<void> {
  const cemadenController = new CemadenController();

  const getChuvasAcumuladasSchema = {
    description: "Obtém as chuvas acumuladas para uma estação específica",
    summary: "Obter chuvas acumuladas CEMADEN",
    tags: ["CEMADEN"],
    params: {
      type: "object",
      properties: {
        codEstacao: {
          type: "string",
          description: "Código da estação"
        }
      },
      required: ["codEstacao"]
    },
    response: {
      200: {
        description: "Dados de chuvas acumuladas",
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object", properties: {
              cod_estacao: { type: "string" },
              snapshot_at: { type: "string", format: "date-time" },
              chuva_24h: { type: "number" },
              chuva_3d: { type: "number" },
              chuva_7d: { type: "number" },
              chuva_15d: { type: "number" },
              chuva_30d: { type: "number" },
              chuva_45d: { type: "number" }
            }
          }
        }
      },
      400: {
        description: "Erro na requisição",
        type: "object",
        properties: {
          error: { type: "string" }
        }
      },
      500: {
        description: "Erro interno do servidor",
        type: "object",
        properties: {
          error: { type: "string" }
        }
      }
    }
  };

  fastify.post(
    "/cemaden/import",
    {},
    cemadenController.import.bind(cemadenController)
  )

  fastify.get("/cemaden/chuvas-acumuladas/:codEstacao", {
    schema: getChuvasAcumuladasSchema
  }, cemadenController.getChuvasAcumuladas.bind(cemadenController));
}
