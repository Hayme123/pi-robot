import type { FastifyPluginAsync } from "fastify";

/**
 * Registers the service health-check endpoint.
 *
 * @param {import("fastify").FastifyInstance} app - Fastify application instance.
 * @returns {Promise<void>} Resolves after the route is registered.
 *
 * @example
 * await app.register(healthRoutes);
 */
const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({ status: "ok" }));
};

export default healthRoutes;
