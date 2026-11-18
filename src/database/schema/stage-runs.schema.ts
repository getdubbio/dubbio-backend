import {
  index,
  pgEnum,
  snakeCase,
  unique,
  uuid,
  varchar,
  integer,
} from "drizzle-orm/pg-core";
import { projectsTable } from "./projects.schema.js";
import { timestamps } from "./helpers/columns.helpers.js";

export const pipelineStage = pgEnum("pipeline_stage", [
  "validate",
  "extract_audio",
  "analyze_video",
  "transcribe",
  "separate_stems",
  "segmentize",
  "translate",
  "synthesize",
  "mix",
  "mux",
  "export",
]);

export const runStatus = pgEnum("run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
]);

export const stageRunsTable = snakeCase.table(
  "stage_runs",
  {
    id: uuid().defaultRandom().primaryKey(),
    projectId: uuid()
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    inputHash: varchar().notNull(),
    vendorRequestId: varchar(),
    stage: pipelineStage().notNull(),
    status: runStatus().notNull(),
    error: varchar(),
    attemptsCount: integer().default(0).notNull(),
    ...timestamps,
  },
  (t) => [
    index().on(t.projectId, t.stage, t.createdAt),
    // with this index, we can't append the same stage on failure,
    // and we are forced to update its state on failure from failed to queued
    // and start it again
    unique().on(t.projectId, t.stage, t.inputHash),
  ],
);
