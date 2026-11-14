import { Module } from "@nestjs/common";
import { DrizzleModule } from "@nestjs/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./config/env.js";

@Module({
  imports: [
    DrizzleModule.forRoot({
      drizzle,
      connection: env.DATABASE_URL,
    }),
  ],
})
export class AppModule {}
