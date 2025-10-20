import { FastifyRequest, FastifyReply } from "fastify";
import {
  usersService,
  CreateUserData,
  UpdateUserData,
  LoginData
} from "../services/users.service.ts";

export class UsersController {
  /**
   * Criar usuário
   */
  async createUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = request.body as CreateUserData;

      // Validações básicas
      if (!data.email || !data.password) {
        return reply.status(400).send({
          error: "Email e senha são obrigatórios"
        });
      }

      if (data.password.length < 6) {
        return reply.status(400).send({
          error: "Senha deve ter pelo menos 6 caracteres"
        });
      }

      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return reply.status(400).send({
          error: "Formato de email inválido"
        });
      }

      const user = await usersService.createUser(data);

      return reply.status(201).send({
        success: true,
        message: "Usuário criado com sucesso",
        data: user
      });
    } catch (error: any) {
      console.error("Erro no controller createUser:", error);

      if (error.message === "Email já está em uso") {
        return reply.status(409).send({
          error: error.message
        });
      }

      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

  /**
   * Buscar usuário por ID
   */
  async getUserById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      if (!id || isNaN(Number(id))) {
        return reply.status(400).send({
          error: "ID inválido"
        });
      }

      const user = await usersService.getUserById(Number(id));

      return reply.status(200).send({
        success: true,
        data: user
      });
    } catch (error: any) {
      console.error("Erro no controller getUserById:", error);

      if (error.message === "Usuário não encontrado") {
        return reply.status(404).send({
          error: error.message
        });
      }

      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

  /**
   * Listar usuários
   */
  async getAllUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page = "1", limit = "10" } = request.query as {
        page?: string;
        limit?: string;
      };

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(50, Math.max(1, Number(limit))); // Máximo 50 por página

      const result = await usersService.getAllUsers(pageNum, limitNum);

      return reply.status(200).send({
        success: true,
        data: result.users,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error("Erro no controller getAllUsers:", error);

      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

  /**
   * Atualizar usuário
   */
  async updateUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as UpdateUserData;

      if (!id || isNaN(Number(id))) {
        return reply.status(400).send({
          error: "ID inválido"
        });
      }

      // Validações
      if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          return reply.status(400).send({
            error: "Formato de email inválido"
          });
        }
      }

      if (data.password && data.password.length < 6) {
        return reply.status(400).send({
          error: "Senha deve ter pelo menos 6 caracteres"
        });
      }

      const user = await usersService.updateUser(Number(id), data);

      return reply.status(200).send({
        success: true,
        message: "Usuário atualizado com sucesso",
        data: user
      });
    } catch (error: any) {
      console.error("Erro no controller updateUser:", error);

      if (error.message === "Usuário não encontrado") {
        return reply.status(404).send({
          error: error.message
        });
      }

      if (error.message === "Email já está em uso") {
        return reply.status(409).send({
          error: error.message
        });
      }

      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

  /**
   * Deletar usuário
   */
  async deleteUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      if (!id || isNaN(Number(id))) {
        return reply.status(400).send({
          error: "ID inválido"
        });
      }

      const result = await usersService.deleteUser(Number(id));

      return reply.status(200).send({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      console.error("Erro no controller deleteUser:", error);

      if (error.message === "Usuário não encontrado") {
        return reply.status(404).send({
          error: error.message
        });
      }

      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

  /**
   * Login
   */
  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = request.body as LoginData;

      // Validações básicas
      if (!data.email || !data.password) {
        return reply.status(400).send({
          error: "Email e senha são obrigatórios"
        });
      }

      const user = await usersService.validateLogin(data);

      // Gerar JWT token
      const token = request.server.jwt.sign(
        {
          id: user.id,
          email: user.email
        },
        {
          expiresIn: "7d" // Token válido por 7 dias
        }
      );

      return reply.status(200).send({
        success: true,
        message: "Login realizado com sucesso",
        data: {
          user,
          token
        }
      });
    } catch (error: any) {
      console.error("Erro no controller login:", error);

      if (error.message === "Credenciais inválidas") {
        return reply.status(401).send({
          error: error.message
        });
      }

      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }

  /**
   * Verificar token (middleware)
   */
  async verifyToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();

      return reply.status(200).send({
        success: true,
        message: "Token válido",
        data: request.user
      });
    } catch (error) {
      return reply.status(401).send({
        error: "Token inválido ou expirado"
      });
    }
  }

  /**
   * Obter perfil do usuário logado
   */
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userPayload = request.user as { id: number; email: string };

      const user = await usersService.getUserById(userPayload.id);

      return reply.status(200).send({
        success: true,
        data: user
      });
    } catch (error: any) {
      console.error("Erro no controller getProfile:", error);

      if (error.message === "Usuário não encontrado") {
        return reply.status(404).send({
          error: error.message
        });
      }

      return reply.status(500).send({
        error: "Erro interno do servidor"
      });
    }
  }
}

export const usersController = new UsersController();
