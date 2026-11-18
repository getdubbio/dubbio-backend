import {
  index,
  integer,
  pgEnum,
  snakeCase,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { timestampsWithSoftDelete } from "./helpers/columns.helpers.js";
import { studiosTable } from "./studios.schema.js";

export const projectStatus = pgEnum("project_status", [
  "uploading",
  "queued",
  "processing",
  "awaiting_cast",
  "synthesizing",
  "in_review",
  "rendering",
  "completed",
  "failed",
]);

export const projectsTable = snakeCase.table(
  "projects",
  {
    id: uuid().defaultRandom().primaryKey(),
    studioId: uuid()
      .notNull()
      .references(() => studiosTable.id),
    title: varchar().notNull(),
    status: projectStatus().default("uploading").notNull(),
    sourceLang: varchar().default("en").notNull(),
    targetLang: varchar().default("ar").notNull(),
    // TODO(auth): add .references(() => usersTable.id) once the better-auth
    // schema exists.
    createdBy: uuid().notNull(),
    durationMs: integer(),
    ...timestampsWithSoftDelete,
  },
  (t) => [index().on(t.studioId, t.createdAt)],
);
