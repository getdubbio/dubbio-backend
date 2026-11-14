import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { type Env, parseEnv } from "./env.schema.js";

if (existsSync(".env")) {
  loadEnvFile(".env");
}

export const env: Readonly<Env> = parseEnv();
