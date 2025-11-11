import fastify from "fastify";
import cors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifyJwt from "@fastify/jwt";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/pt-br";
import multipart from '@fastify/multipart';
import { registerRoutes } from "./routes/index.ts";
import { runAutomation } from "./scripts/automate_apac";
import { apacRoutes } from "./routes/apac.routes.ts";
import { CemadenScheduler } from "./scripts/cemaden/cemaden-scheduler";
import { runCemadenDataCollection } from "./scripts/cemaden/cemaden-data";
import { runCemadenStationsCollection } from "./scripts/cemaden/cemaden-stations";

// ========================================
// 🔧 CONFIGURAÇÕES GLOBAIS
// ========================================

// Configure dayjs
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("pt-br");

// Configurações do servidor
const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ========================================
// 🚀 INICIALIZAÇÃO DO SERVIDOR
// ========================================

const app = fastify({
  logger: {
    level: "debug"
  },
});

// ========================================
// 🔌 PLUGINS E MIDDLEWARES
// ========================================

// Multipart Configuration
app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
})

// CORS Configuration
app.register(cors, {
  origin: [
    "*",
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
});

// JWT Configuration
app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "super-secret-key-change-in-production",
  sign: {
    expiresIn: "7d"
  }
});

// Swagger/OpenAPI Configuration
app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Dashboard Chuva API",
      description:
        "API para coleta e monitoramento de dados meteorológicos da APAC",
      version: "1.0.0"
    },
    servers: [
      {
        url:
          NODE_ENV === "production"
            ? "https://serveragro-production.up.railway.app/"
            : `http://localhost:${PORT}`,
        description:
          NODE_ENV === "production"
            ? "Servidor de produção"
            : "Servidor de desenvolvimento"
      }
    ],
    components: {
      securitySchemes: {
        apiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "Autenticação usando API Key no header x-api-key"
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Autenticação usando JWT Bearer Token"
        }
      }
    },
    tags: [
      {
        name: "Usuários",
        description: "CRUD completo para gerenciamento de usuários do sistema"
      },
      {
        name: "Autenticação",
        description: "Endpoints para autenticação e autorização com JWT"
      },
      {
        name: "APAC",
        description: "Endpoints para consulta de dados meteorológicos da APAC"
      },
      {
        name: "CEMADEN",
        description: "Endpoints para importação de dados do CEMADEN e monitoramento"
      }
    ]
  }
});

// ========================================
// 📚 DOCUMENTAÇÃO API
// ========================================

// OpenAPI JSON endpoint
app.get(
  "/openapi.json",
  {
    schema: {
      hide: true // Ocultar da documentação
    }
  },
  async () => {
    return app.swagger();
  }
);

// Scalar API Reference (documentação interativa)
app.register(async function (fastifyInstance) {
  try {
    const { default: ScalarApiReference } = await import(
      "@scalar/fastify-api-reference"
    );
    await fastifyInstance.register(ScalarApiReference as any, {
      routePrefix: "/docs",
      configuration: {
        title: "Weather Data Collection API",
        theme: "purple",
        layout: "modern",
        defaultHttpClient: {
          targetKey: "js",
          clientKey: "fetch"
        }
      }
    });
  } catch (error) {
    console.error("Erro ao carregar Scalar API Reference:", error);
  }
});


app.register(registerRoutes);
app.register(apacRoutes);

// Rota de healthcheck simples (backup)
app.get(
  "/ping",
  {
    schema: {
      hide: true,
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
            timestamp: { type: "string" }
          }
        }
      }
    }
  },
  async () => {
    return {
      message: "pong",
      timestamp: dayjs().tz("America/Sao_Paulo").format("DD/MM/YYYY HH:mm:ss")
    };
  }
);

async function runInitialDataCollection(): Promise<void> {
  console.log("🚀 Executando coleta inicial de dados...");

  try {
    // Executar coletas iniciais em paralelo
    await Promise.allSettled([runAutomation()]);

    console.log("✅ Coleta inicial concluída");
  } catch (error) {
    console.error("❌ Erro na coleta inicial:", error);
  }
}

async function startCemadenScheduler(): Promise<void> {
  console.log("📡 Iniciando scheduler do CEMADEN...");
  
  try {
    // Executar coleta inicial de estações e dados
    console.log("🔄 Executando coleta inicial do CEMADEN...");
    await Promise.allSettled([
      runCemadenStationsCollection(),
      runCemadenDataCollection()
    ]);
    console.log("✅ Coleta inicial do CEMADEN concluída");
    
    // Iniciar coleta de dados a cada 3 minutos
    CemadenScheduler.startDataCollection();
    console.log("✅ Scheduler de dados do CEMADEN iniciado (executa a cada 3 minutos)");
    
    // Iniciar coleta de estações uma vez por dia às 00:00
    CemadenScheduler.startStationsCollection();
    console.log("✅ Scheduler de estações do CEMADEN iniciado (executa diariamente às 00:00)");
  } catch (error) {
    console.error("❌ Erro ao iniciar scheduler do CEMADEN:", error);
  }
}

// Handler para erros não capturados
process.on("uncaughtException", (error) => {
  console.error("💥 Erro não capturado:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Promise rejeitada não tratada:", reason);
  console.error("Promise:", promise);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 Recebido SIGTERM, encerrando servidor...");
  CemadenScheduler.stopAll();
  await app.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 Recebido SIGINT, encerrando servidor...");
  CemadenScheduler.stopAll();
  await app.close();
  process.exit(0);
});

async function startServer(): Promise<void> {
  try {
    await app.listen({
      port: PORT,
      host: NODE_ENV === "production" ? "0.0.0.0" : "localhost"
    });

    console.log("🎉 Servidor iniciado com sucesso!");
    console.log(`🌐 Servidor rodando em: http://localhost:${PORT}`);
    console.log(`📚 Documentação API: http://localhost:${PORT}/docs`);
    console.log(`📄 OpenAPI JSON: http://localhost:${PORT}/openapi.json`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`📍 Ambiente: ${NODE_ENV}`);

    if (NODE_ENV !== "test") {
      await runInitialDataCollection();
      await startCemadenScheduler();
    }
  } catch (error) {
    console.error("💥 Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}

if (NODE_ENV !== "test") {
  startServer();
}

export { app };
