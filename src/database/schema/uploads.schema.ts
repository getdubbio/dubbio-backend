import {
  bigint,
  index,
  integer,
  pgEnum,
  snakeCase,
  timestamp,
  uuid,
  varchar,
  check,
} from "drizzle-orm/pg-core";
import { or, and, eq, isNull } from "drizzle-orm";
import { voicesTable } from "./voices.schema.js";
import { studiosTable } from "./studios.schema.js";
import { projectsTable } from "./projects.schema.js";
import { timestamps } from "./helpers/columns.helpers.js";

export const uploadKind = pgEnum("upload_kind", [
  "voice_sample",
  "project_video",
]);

export const uploadStatus = pgEnum("upload_status", [
  "pending",
  "completed",
  "aborted",
  "expired",
]);

export const uploadsTable = snakeCase.table(
  "uploads",
  {
    id: uuid().defaultRandom().primaryKey(),
    studioId: uuid()
      .notNull()
      .references(() => studiosTable.id),
    kind: uploadKind().notNull(),
    contentType: varchar().notNull(),
    voiceId: uuid().references(() => voicesTable.id),
    projectId: uuid().references(() => projectsTable.id, {
      onDelete: "cascade",
    }),
    expectedSizeBytes: bigint({ mode: "number" }).notNull(),
    r2Key: varchar().notNull().unique(),
    multipartUploadId: varchar(),
    partSizeBytes: integer(),
    status: uploadStatus().default("pending").notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [
    index().on(t.status, t.expiresAt),
    index().on(t.studioId, t.createdAt),
    index().on(t.projectId),
    index().on(t.voiceId),
    check(
      "kind_check",
      or(
        and(eq(t.kind, "project_video"), isNull(t.voiceId)),
        and(eq(t.kind, "voice_sample"), isNull(t.projectId)),
      )!,
    ),
  ],
);
