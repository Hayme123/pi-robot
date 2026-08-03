import { buildApp } from "./app.js";
import { config, validateConfig } from "./config.js";

validateConfig();
const app = buildApp();

await app.listen({ host: config.host, port: config.port });
