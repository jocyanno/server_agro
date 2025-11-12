import { FastifyInstance } from "fastify";
import { usersController } from "../controllers/users.controller";

export async function usersRoutes(fastify: FastifyInstance) {
  // ========================================
  // 📝 SCHEMAS DE VALIDAÇÃO
  // ========================================

  const userSchema = {
    type: "object",
    properties: {
      id: { type: "number" },
      name: { type: "string", nullable: true },
      email: { type: "string" },
      role: { type: "string", enum: ["user", "admin"] },
      createdAt: { type: "string" },
      updatedAt: { type: "string" }
    }
  };

  const createUserSchema = {
    type: "object",
    required: ["email", "password"],
    properties: {
      name: { type: "string", minLength: 2, maxLength: 100 },
      email: { type: "string", format: "email", maxLength: 255 },
      password: { type: "string", minLength: 6, maxLength: 100 },
      role: { type: "string", enum: ["user", "admin"] }
    }
  };

  const updateUserSchema = {
    type: "object",
    properties: {
      name: { type: "string", minLength: 2, maxLength: 100 },
      email: { type: "string", format: "email", maxLength: 255 },
      password: { type: "string", minLength: 6, maxLength: 100 }
    }
  };

  const loginSchema = {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 1 }
    }
  };

  const errorSchema = {
    type: "object",
    properties: {
      error: { type: "string" }
    }
  };

  const successSchema = {
    type: "object",
    properties: {
      success: { type: "boolean" },
      message: { type: "string" },
      data: { type: "object" }
    }
  };

  const paginationSchema = {
    type: "object",
    properties: {
      page: { type: "number" },
      limit: { type: "number" },
      total: { type: "number" },
      pages: { type: "number" }
    }
  };

  // ========================================
  // 🔓 ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
  // ========================================

  /**
   * Criar usuário (Registro)
   */
  fastify.post(
    "/users",
    {
      schema: {
        tags: ["Usuários"],
        summary: "Criar novo usuário",
        description: "Cria um novo usuário no sistema com hash da senha",
        body: createUserSchema,
        response: {
          201: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: userSchema
            }
          },
          400: errorSchema,
          409: errorSchema,
          500: errorSchema
        }
      }
    },
    usersController.createUser
  );

  /**
   * Login
   */
  fastify.post(
    "/auth/login",
    {
      schema: {
        tags: ["Autenticação"],
        summary: "Fazer login",
        description: "Autentica usuário e retorna token JWT",
        body: loginSchema,
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  user: userSchema,
                  token: { type: "string" }
                }
              }
            }
          },
          400: errorSchema,
          401: errorSchema,
          500: errorSchema
        }
      }
    },
    usersController.login
  );

  /**
   * Verificar token
   */
  fastify.get(
    "/auth/verify",
    {
      schema: {
        tags: ["Autenticação"],
        summary: "Verificar token JWT",
        description: "Verifica se o token JWT é válido",
        security: [{ bearerAuth: [] }],
        response: {
          200: successSchema,
          401: errorSchema
        }
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err: any) {
          return reply.status(401).send({
            success: false,
            error: err.message || "Token inválido ou expirado"
          });
        }
      }
    },
    usersController.verifyToken
  );

  // ========================================
  // 🔒 ROTAS PROTEGIDAS (COM AUTENTICAÇÃO)
  // ========================================

  /**
   * Obter perfil do usuário logado
   */
  fastify.get(
    "/auth/profile",
    {
      schema: {
        tags: ["Usuários"],
        summary: "Obter perfil do usuário logado",
        description: "Retorna os dados do usuário autenticado",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: userSchema
            }
          },
          401: errorSchema,
          404: errorSchema,
          500: errorSchema
        }
      },
      preHandler: async (request, reply) => {
        try {
          const authHeader = request.headers.authorization;
          console.log('Authorization header:', authHeader);
          
          await request.jwtVerify();
          
          console.log('JWT verificado com sucesso');
          console.log('request.user:', request.user);
          console.log('request.user type:', typeof request.user);
          console.log('request.user keys:', request.user ? Object.keys(request.user) : 'null');
        } catch (err: any) {
          console.error('Erro ao verificar JWT:', err.message);
          console.error('Stack trace:', err.stack);
          return reply.status(401).send({
            success: false,
            error: err.message || "Token inválido ou expirado"
          });
        }
      }
    },
    usersController.getProfile
  );

  /**
   * Listar usuários
   */
  fastify.get(
    "/users",
    {
      schema: {
        tags: ["Usuários"],
        summary: "Listar usuários",
        description: "Lista usuários com paginação",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            page: { type: "number", minimum: 1, default: 1 },
            limit: { type: "number", minimum: 1, maximum: 50, default: 10 }
          }
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "array",
                items: userSchema
              },
              pagination: paginationSchema
            }
          },
          401: errorSchema,
          500: errorSchema
        }
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err: any) {
          return reply.status(401).send({
            success: false,
            error: err.message || "Token inválido ou expirado"
          });
        }
      }
    },
    usersController.getAllUsers
  );

  /**
   * Buscar usuário por ID
   */
  fastify.get(
    "/users/:id",
    {
      schema: {
        tags: ["Usuários"],
        summary: "Buscar usuário por ID",
        description: "Retorna os dados de um usuário específico",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "number", minimum: 1 }
          }
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: userSchema
            }
          },
          400: errorSchema,
          401: errorSchema,
          404: errorSchema,
          500: errorSchema
        }
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err: any) {
          return reply.status(401).send({
            success: false,
            error: err.message || "Token inválido ou expirado"
          });
        }
      }
    },
    usersController.getUserById
  );

  /**
   * Atualizar usuário
   */
  fastify.put(
    "/users/:id",
    {
      schema: {
        tags: ["Usuários"],
        summary: "Atualizar usuário",
        description: "Atualiza os dados de um usuário",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "number", minimum: 1 }
          }
        },
        body: updateUserSchema,
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: userSchema
            }
          },
          400: errorSchema,
          401: errorSchema,
          404: errorSchema,
          409: errorSchema,
          500: errorSchema
        }
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err: any) {
          return reply.status(401).send({
            success: false,
            error: err.message || "Token inválido ou expirado"
          });
        }
      }
    },
    usersController.updateUser
  );

  /**
   * Deletar usuário
   */
  fastify.delete(
    "/users/:id",
    {
      schema: {
        tags: ["Usuários"],
        summary: "Deletar usuário",
        description: "Remove um usuário do sistema",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "number", minimum: 1 }
          }
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          },
          400: errorSchema,
          401: errorSchema,
          404: errorSchema,
          500: errorSchema
        }
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err: any) {
          return reply.status(401).send({
            success: false,
            error: err.message || "Token inválido ou expirado"
          });
        }
      }
    },
    usersController.deleteUser
  );
}
