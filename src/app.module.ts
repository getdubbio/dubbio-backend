import { Module } from "@nestjs/common";
import { DrizzleModule } from "@nestjs/drizzle";
import { QueueModule } from "./infrastructure/queue/queue.module.js";
import { DevPingController } from "./infrastructure/queue/dev-ping.controller.js";
import { db } from "./database/db.js";
import { AuthModule } from "./modules/auth/auth.module.js";

@Module({
  imports: [
    // already register the module globally, pass to it the db instance created manually to be reused by nest
    DrizzleModule.forRoot({ db }),
    AuthModule,
    QueueModule,
  ],
  controllers: [DevPingController], // TEMP
})
export class AppModule {}
