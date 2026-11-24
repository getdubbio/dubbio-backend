import { existsSync } from "node:fs";
import { exit, loadEnvFile } from "node:process";
import { z } from "zod";

if (existsSync(".env")) {
  loadEnvFile(".env");
}

const envSchema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  PROVIDERS_MODE: z.enum(["mock"]).default("mock"),
  NODE_ENV: z.enum(["development", "production"]),
  BETTER_AUTH_SECRET: z.base64(),
  BETTER_AUTH_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = z.safeParse(envSchema, process.env);
if (parsed.error) {
  console.error(parsed.error.message);
  exit(1);
}

export const env: Env = parsed.data;
