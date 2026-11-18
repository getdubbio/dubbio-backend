import { index, pgEnum, snakeCase, timestamp, uuid } from "drizzle-orm/pg-core";
import { assetsTable } from "./assets.schema.js";
import { projectsTable } from "./projects.schema.js";
import { timestamps } from "./helpers/columns.helpers.js";

export const exportStatus = pgEnum("export_status", [
  "rendering",
  "ready",
  "failed",
]);

export const exportsTable = snakeCase.table(
  "exports",
  {
    id: uuid().defaultRandom().primaryKey(),
    projectId: uuid()
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    videoAssetId: uuid().references(() => assetsTable.id),
    status: exportStatus().default("rendering").notNull(),
    completedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.projectId, t.createdAt), index().on(t.videoAssetId)],
);
