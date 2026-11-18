import {
  bigint,
  index,
  pgEnum,
  snakeCase,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { projectsTable } from "./projects.schema.js";

export const assetKind = pgEnum("asset_kind", [
  "source_video",
  "dialogue_track",
  "background_track",
  "transcript",
  "analysis",
  "dubbed_track",
  "segment_audio",
  "export_video",
]);

export const assetsTable = snakeCase.table(
  "assets",
  {
    id: uuid().defaultRandom().primaryKey(),
    projectId: uuid()
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    kind: assetKind().notNull(),
    contentType: varchar().notNull(),
    sizeBytes: bigint({ mode: "number" }).notNull(),
    r2Key: varchar().unique().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index().on(t.projectId, t.kind)],
);
