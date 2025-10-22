import { FastifyInstance } from "fastify";
import { usersRoutes } from "./users.routes";
import { cemadenRoutes } from "./cemaden.routes";

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(usersRoutes);
  await fastify.register(cemadenRoutes);
}
