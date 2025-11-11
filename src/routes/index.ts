import { FastifyInstance } from 'fastify';
import { usersRoutes } from './users.routes';
import { cemadenRoutes } from './cemaden.routes';
import { seguradoraRoutes } from './seguradora.routes';
import { agroRoutes } from './agro.routes';
import { aiRoutes } from './ai.routes';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(usersRoutes);
  await fastify.register(cemadenRoutes);
  await fastify.register(seguradoraRoutes);
  await fastify.register(agroRoutes);
  await fastify.register(aiRoutes);
}
