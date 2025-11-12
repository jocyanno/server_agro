import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { Role } from "@prisma/client";

export interface CreateUserData {
  name?: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class UsersService {
  /**
   * Criar um novo usuário
   */
  async createUser(data: CreateUserData) {
    try {
      // Verificar se o email já existe
      const existingUser = await prisma.users.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        throw new Error("Email já está em uso");
      }

      // Hash da senha
      const saltRounds = 6;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      // Criar usuário
      const user = await prisma.users.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: data.role as Role
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return user;
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      throw error;
    }
  }

  /**
   * Buscar usuário por ID
   */
  async getUserById(id: number) {
    try {
      const user = await prisma.users.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      return user;
    } catch (error: any) {
      console.error("Erro ao buscar usuário:", error);
      console.error("Stack trace:", error.stack);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      throw error;
    }
  }

  /**
   * Buscar usuário por email (para login)
   */
  async getUserByEmail(email: string) {
    try {
      const user = await prisma.users.findUnique({
        where: { email }
      });

      return user;
    } catch (error) {
      console.error("Erro ao buscar usuário por email:", error);
      throw error;
    }
  }

  /**
   * Listar todos os usuários
   */
  async getAllUsers(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.users.findMany({
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: {
            createdAt: "desc"
          }
        }),
        prisma.users.count()
      ]);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      throw error;
    }
  }

  /**
   * Atualizar usuário
   */
  async updateUser(id: number, data: UpdateUserData) {
    try {
      // Verificar se o usuário existe
      const existingUser = await prisma.users.findUnique({
        where: { id }
      });

      if (!existingUser) {
        throw new Error("Usuário não encontrado");
      }

      // Se está alterando email, verificar se não está em uso
      if (data.email && data.email !== existingUser.email) {
        const emailInUse = await prisma.users.findUnique({
          where: { email: data.email }
        });

        if (emailInUse) {
          throw new Error("Email já está em uso");
        }
      }

      // Preparar dados para atualização
      const updateData: any = {
        name: data.name,
        email: data.email
      };

      // Se está alterando senha, fazer hash
      if (data.password) {
        const saltRounds = 12;
        updateData.password = await bcrypt.hash(data.password, saltRounds);
      }

      // Atualizar usuário
      const user = await prisma.users.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return user;
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      throw error;
    }
  }

  /**
   * Deletar usuário
   */
  async deleteUser(id: number) {
    try {
      // Verificar se o usuário existe
      const existingUser = await prisma.users.findUnique({
        where: { id }
      });

      if (!existingUser) {
        throw new Error("Usuário não encontrado");
      }

      // Deletar usuário
      await prisma.users.delete({
        where: { id }
      });

      return { message: "Usuário deletado com sucesso" };
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      throw error;
    }
  }

  /**
   * Validar login
   */
  async validateLogin(data: LoginData) {
    try {
      // Buscar usuário por email
      const user = await this.getUserByEmail(data.email);

      if (!user) {
        throw new Error("Credenciais inválidas");
      }

      // Verificar senha
      const isValidPassword = await bcrypt.compare(
        data.password,
        user.password
      );

      if (!isValidPassword) {
        throw new Error("Credenciais inválidas");
      }

      // Retornar dados do usuário (sem senha)
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      console.error("Erro ao validar login:", error);
      throw error;
    }
  }
}

export const usersService = new UsersService();
