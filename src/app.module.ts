import { Module } from "@nestjs/common";
import { DrizzleModule } from "@nestjs/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./config/env.js";
import { relations } from "./database/relations.js";

@Module({
  imports: [
    DrizzleModule.forRoot({
      drizzle,
      connection: env.DATABASE_URL,
      relations, // relations for relational query API
    }),
  ],
})
export class AppModule {}
