import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../config/env.js";
import { relations } from "./relations.js";

export const db = drizzle(env.DATABASE_URL, { relations });
export type Database = typeof db;
