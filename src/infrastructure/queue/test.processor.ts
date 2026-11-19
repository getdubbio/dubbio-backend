// TEMP: remove once the pipeline processor (F6) owns
// the pipeline queue.
import { Logger } from "@nestjs/common";
import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { EventsService } from "../events/events.service.js";
import { JOBS, QUEUES } from "./queue.constants.js";
import { TestPingPayload } from "./queue.types.js";

@Processor(QUEUES.PIPELINE)
export class TestProcessor extends WorkerHost {
  private readonly logger = new Logger(TestProcessor.name);

  constructor(private readonly events: EventsService) {
    super();
  }

  async process(job: Job<TestPingPayload>): Promise<void> {
    if (job.name !== JOBS.TEST_PING) {
      throw new Error(`Unknown job "${job.name}" on ${QUEUES.PIPELINE}`);
    }

    this.logger.log(`Processing ${job.name} #${job.id}: ${job.data.message}`);

    await this.events.publish(job.data.studioId, {
      type: JOBS.TEST_PING,
      data: { jobId: job.id, message: job.data.message },
    });
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job): void {
    this.logger.log(`Job ${job.name} #${job.id} completed`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, err: Error): void {
    this.logger.error(
      `Job ${job?.name} #${job?.id} failed: ${err.message}`,
      err.stack,
    );
  }
}
