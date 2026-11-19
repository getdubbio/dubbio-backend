// TEMP delete together with TestProcessor.
import { Controller, Post } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { JOBS, QUEUES } from "./queue.constants.js";
import { TestPingPayload } from "./queue.types.js";

// Fixed id: no auth yet
const DEV_STUDIO_ID = "dev";

@Controller("dev")
export class DevPingController {
  constructor(@InjectQueue(QUEUES.PIPELINE) private readonly pipeline: Queue) {}

  @Post("ping")
  async ping(): Promise<{ jobId: string | undefined; channel: string }> {
    const payload: TestPingPayload = {
      studioId: DEV_STUDIO_ID,
      message: `ping ${new Date().toISOString()}`,
    };
    const job = await this.pipeline.add(JOBS.TEST_PING, payload, {
      removeOnComplete: true,
      removeOnFail: 100,
    });
    return { jobId: job.id, channel: `events:${DEV_STUDIO_ID}` };
  }
}
