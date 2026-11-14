import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { env } from "../config/env.js";

const migrationsFolder = fileURLToPath(
  new URL("../../drizzle", import.meta.url),
);

async function main(): Promise<void> {
  const db = drizzle(env.DATABASE_URL);

  try {
    await migrate(db, { migrationsFolder });
    console.log("Database migrations applied.");
  } finally {
    await db.$client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Database migration failed:", error);
  process.exitCode = 1;
});
