import path from "node:path";

/**
 * Loads the API runtime configuration from environment variables.
 *
 * @type {{ host: string, port: number, projectsRoot: string, scaffoldArchive: string, angularNodeModules?: string }}
 */
export const config = {
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 3000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:8080",
  projectsRoot: path.resolve(process.env.PROJECTS_ROOT ?? "./projects"),
  scaffoldArchive: process.env.SCAFFOLD_ARCHIVE ?? path.resolve("scaffolds/frontend-scaffold.zip"),
  angularNodeModules: process.env.ANGULAR_NODE_MODULES && path.resolve(process.env.ANGULAR_NODE_MODULES),
  expiryCronSecret: process.env.EXPIRY_CRON_SECRET ?? "",
  supabase: {
    url: process.env.SUPABASE_URL ?? "",
    audience: process.env.SUPABASE_JWT_AUDIENCE ?? "authenticated",
    secretKey: process.env.SUPABASE_SECRET_KEY ?? "",
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    bucket: process.env.R2_BUCKET ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    signedUrlTtlSeconds: Number(process.env.R2_SIGNED_URL_TTL_SECONDS ?? 300),
  },
};

/**
 * Validates required runtime configuration before the API starts.
 *
 * @returns {void} Returns after configuration is valid.
 * @throws {Error} If a required value is missing or invalid.
 *
 * @example
 * validateConfig();
 */
export function validateConfig(): void {
  const required = {
    SUPABASE_URL: config.supabase.url,
    SUPABASE_SECRET_KEY: config.supabase.secretKey,
    R2_ACCOUNT_ID: config.r2.accountId,
    R2_BUCKET: config.r2.bucket,
    R2_ACCESS_KEY_ID: config.r2.accessKeyId,
    R2_SECRET_ACCESS_KEY: config.r2.secretAccessKey,
  };
  const missing = Object.entries(required).filter(([, value]) => !value.trim()).map(([name]) => name);
  if (missing.length) throw new Error(`Missing required configuration: ${missing.join(", ")}`);
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error("PORT must be an integer from 1 to 65535");
  if (!Number.isInteger(config.r2.signedUrlTtlSeconds) || config.r2.signedUrlTtlSeconds < 1 || config.r2.signedUrlTtlSeconds > 3600) throw new Error("R2_SIGNED_URL_TTL_SECONDS must be an integer from 1 to 3600");
  try {
    new URL(config.supabase.url);
  } catch {
    throw new Error("SUPABASE_URL must be a valid URL");
  }
  try {
    new URL(config.publicBaseUrl);
  } catch {
    throw new Error("PUBLIC_BASE_URL must be a valid URL");
  }
}
