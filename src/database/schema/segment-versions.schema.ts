import {
  bigint,
  index,
  integer,
  pgEnum,
  snakeCase,
  uuid,
  varchar,
  unique,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { assetsTable } from "./assets.schema.js";
import { segmentsTable } from "./segments.schema.js";
import { voicesTable } from "./voices.schema.js";
import { timestamps } from "./helpers/columns.helpers.js";

export const versionStatus = pgEnum("version_status", [
  "pending",
  "generating",
  "ready",
  "failed",
]);

export const segmentVersionsTable = snakeCase.table(
  "segment_versions",
  {
    id: uuid().defaultRandom().primaryKey(),
    segmentId: uuid()
      .notNull()
      .references((): AnyPgColumn => segmentsTable.id, {
        onDelete: "cascade",
      }),
    version: integer().notNull(),
    voiceId: uuid().references(() => voicesTable.id),
    durationMs: integer(),
    translatedText: varchar().notNull(),
    seed: bigint({ mode: "number" }),
    emotion: varchar().notNull(),
    status: versionStatus().default("pending").notNull(),
    audioAssetId: uuid().references(() => assetsTable.id),
    ...timestamps,
  },
  (t) => [
    index().on(t.segmentId, t.createdAt),
    index().on(t.audioAssetId),
    index().on(t.voiceId),
    unique().on(t.segmentId, t.version),
  ],
);
