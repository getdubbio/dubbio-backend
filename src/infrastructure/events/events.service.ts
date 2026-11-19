import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";
import { env } from "../../config/env.js";
import { DubbioEvent, eventsChannel } from "./events.types.js";

// Publishes progress events on Redis pub/sub (channel events:{studioId}).
// Best effort: a failed publish is logged, never thrown into the job.
@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private readonly redis = new Redis(env.REDIS_URL);

  constructor() {
    this.redis.on("error", (err: Error) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  async publish(studioId: string, event: DubbioEvent): Promise<void> {
    const channel = eventsChannel(studioId);
    try {
      await this.redis.publish(channel, JSON.stringify(event));
      this.logger.log(`Published "${event.type}" to ${channel}`);
    } catch (error) {
      this.logger.warn(
        `Failed to publish "${event.type}" to ${channel}: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
