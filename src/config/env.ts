import { existsSync } from "node:fs";
import { exit, loadEnvFile } from "node:process";
import { z } from "zod";

if (existsSync(".env")) {
  loadEnvFile(".env");
}

const envSchema = z.object({
  DATABASE_URL: z.url(),
  API_PORT: z.coerce.number().default(3000),
});

export type Env = z.infer<typeof envSchema>;

const parsed = z.safeParse(envSchema, process.env);
if (parsed.error) {
  console.error(parsed.error.message);
  exit(1);
}
export const env: Env = parsed.data;
