import { Module } from "@nestjs/common";
import { DrizzleModule } from "@nestjs/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./config/env.js";
import { relations } from "./database/relations.js";
import { QueueModule } from "./infrastructure/queue/queue.module.js";
import { DevPingController } from "./infrastructure/queue/dev-ping.controller.js";

@Module({
  imports: [
    DrizzleModule.forRoot({
      drizzle,
      connection: env.DATABASE_URL,
      relations, // relations for relational query API
    }),
    QueueModule,
  ],
  controllers: [DevPingController], // TEMP
})
export class AppModule {}
