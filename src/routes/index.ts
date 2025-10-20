import { FastifyInstance } from "fastify";
import { usersRoutes } from "./users.routes";

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(usersRoutes);
}
