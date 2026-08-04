import type { FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config.js";

declare module "fastify" {
  interface FastifyRequest {
    ownerId: string;
  }
}

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

/**
 * Authenticates a Bearer JWT and assigns its subject as the request owner.
 *
 * @param {FastifyRequest} request - Incoming API request.
 * @param {FastifyReply} reply - Reply used for authentication failures.
 * @returns {Promise<void>} Resolves after authentication or an error reply.
 *
 * @example
 * await app.addHook("preHandler", authenticate);
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) {
    await reply.code(401).send({ error: "unauthorized" });
    return;
  }

  try {
    jwks ??= createRemoteJWKSet(new URL(`${config.supabase.url}/auth/v1/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${config.supabase.url}/auth/v1`,
      audience: config.supabase.audience,
    });
    if (!payload.sub) throw new Error("JWT subject is missing");
    request.ownerId = payload.sub;
  } catch {
    await reply.code(401).send({ error: "unauthorized" });
    return;
  }

  if (request.body && typeof request.body === "object" && Object.hasOwn(request.body, "owner_id")) {
    await reply.code(400).send({ error: "owner_id is derived from the access token" });
  }
}
