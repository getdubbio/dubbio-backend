import {
  index,
  integer,
  pgEnum,
  snakeCase,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { charactersTable } from "./characters.schema.js";
import { projectsTable } from "./projects.schema.js";
import { segmentVersionsTable } from "./segment-versions.schema.js";
import { timestamps } from "./helpers/columns.helpers.js";

export const reviewStatus = pgEnum("review_status", [
  "pending",
  "approved",
  "flagged",
]);

export const segmentsTable = snakeCase.table(
  "segments",
  {
    id: uuid().defaultRandom().primaryKey(),
    projectId: uuid()
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    characterId: uuid()
      .notNull()
      .references(() => charactersTable.id),
    startMs: integer().notNull(),
    endMs: integer().notNull(),
    sourceText: varchar().notNull(),
    emotion: varchar().notNull(),
    reviewStatus: reviewStatus().default("pending").notNull(),
    currentVersionId: uuid().references(() => segmentVersionsTable.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index().on(t.projectId, t.startMs),
    index().on(t.characterId),
    index().on(t.currentVersionId), // index on foreign key that checks the whole segments table on a segment version delete
  ],
);
