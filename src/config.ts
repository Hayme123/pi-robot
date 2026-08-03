import path from "node:path";

/**
 * Loads the API runtime configuration from environment variables.
 *
 * @type {{ host: string, port: number, projectsRoot: string, scaffoldArchive: string, angularNodeModules?: string }}
 */
export const config = {
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 3000),
  projectsRoot: path.resolve(process.env.PROJECTS_ROOT ?? "./projects"),
  scaffoldArchive: process.env.SCAFFOLD_ARCHIVE ?? path.resolve("scaffolds/frontend-scaffold.zip"),
  angularNodeModules: process.env.ANGULAR_NODE_MODULES && path.resolve(process.env.ANGULAR_NODE_MODULES),
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
  },
  modal: {
    tokenId: process.env.MODAL_TOKEN_ID ?? "",
    tokenSecret: process.env.MODAL_TOKEN_SECRET ?? "",
    appName: process.env.MODAL_APP_NAME ?? "",
  },
};

export function validateConfig(): void {
  const required = {
    SUPABASE_URL: config.supabase.url,
    SUPABASE_SECRET_KEY: config.supabase.secretKey,
    R2_ACCOUNT_ID: config.r2.accountId,
    R2_BUCKET: config.r2.bucket,
    R2_ACCESS_KEY_ID: config.r2.accessKeyId,
    R2_SECRET_ACCESS_KEY: config.r2.secretAccessKey,
    MODAL_TOKEN_ID: config.modal.tokenId,
    MODAL_TOKEN_SECRET: config.modal.tokenSecret,
    MODAL_APP_NAME: config.modal.appName,
  };
  const missing = Object.entries(required).filter(([, value]) => !value.trim()).map(([name]) => name);
  if (missing.length) throw new Error(`Missing required configuration: ${missing.join(", ")}`);
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error("PORT must be an integer from 1 to 65535");
  try {
    new URL(config.supabase.url);
  } catch {
    throw new Error("SUPABASE_URL must be a valid URL");
  }
}
