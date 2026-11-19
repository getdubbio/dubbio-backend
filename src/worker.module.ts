import { Module } from "@nestjs/common";
import { EventsModule } from "./infrastructure/events/events.module.js";
import { ProvidersModule } from "./infrastructure/providers/providers.module.js";
import { QueueModule } from "./infrastructure/queue/queue.module.js";
import { TestProcessor } from "./infrastructure/queue/test.processor.js";

// Root module of the worker process (main.worker.ts). Processors live here,
// never in AppModule.
@Module({
  imports: [QueueModule, EventsModule, ProvidersModule],
  providers: [TestProcessor], // TEMP
})
export class WorkerModule {}
