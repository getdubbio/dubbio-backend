import {
  index,
  pgEnum,
  snakeCase,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { projectsTable } from "./projects.schema.js";
import { voicesTable } from "./voices.schema.js";
import { timestamps } from "./helpers/columns.helpers.js";

export const gender = pgEnum("gender", ["male", "female", "unknown"]);

export const charactersTable = snakeCase.table(
  "characters",
  {
    id: uuid().defaultRandom().primaryKey(),
    gender: gender().default("unknown").notNull(),
    projectId: uuid()
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    voiceId: uuid().references(() => voicesTable.id, {
      onDelete: "set null",
    }),
    providerSpeakerId: varchar(),
    ...timestamps,
  },
  (t) => [
    // Multiple characters may still be unmapped (NULL speaker id), which the
    // default NULLS DISTINCT behavior allows.
    uniqueIndex().on(t.projectId, t.providerSpeakerId),
    index().on(t.voiceId),
  ],
);
