import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { env } from "../../config/env.js";
import { QUEUES } from "./queue.constants.js";

// Shared by the API (producers) and the worker. Processors are registered in
// WorkerModule only, so the API process never consumes jobs.
@Module({
  imports: [
    BullModule.forRoot({
      connection: { url: env.REDIS_URL },
    }),
    BullModule.registerQueue(
      ...Object.values(QUEUES).map((name) => ({ name })),
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
