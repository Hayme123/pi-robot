import Fastify from "fastify";
import healthRoutes from "./routes/health.js";
import projectRoutes from "./routes/project.js";

/**
 * Builds a Fastify application with all API routes registered.
 *
 * @returns {import("fastify").FastifyInstance} Configured Fastify application.
 *
 * @example
 * const app = buildApp();
 * await app.listen({ port: 3000 });
 */
export function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport: {
        target: "pino-pretty",
        options: { colorize: false, translateTime: "SYS:standard", ignore: "pid,hostname,reqId" },
      },
    },
  });
  app.register(healthRoutes);
  app.register(projectRoutes);
  return app;
}
