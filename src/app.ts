import { readFile } from "node:fs/promises";
import path from "node:path";
import Fastify from "fastify";
import healthRoutes from "./routes/health.js";
import projectRoutes from "./routes/project.js";

const swaggerUiHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pi Frontend Builder API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>window.ui = SwaggerUIBundle({ url: "/docs/openapi.yaml", dom_id: "#swagger-ui" });</script>
</body>
</html>`;

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
  app.get("/docs", async (_request, reply) => reply.type("text/html; charset=utf-8").send(swaggerUiHtml));
  app.get("/docs/openapi.yaml", async (_request, reply) => {
    const openapi = await readFile(path.resolve("docs/openapi.yaml"), "utf8");
    return reply.type("text/yaml").send(openapi);
  });
  app.register(healthRoutes);
  app.register(projectRoutes);
  return app;
}
