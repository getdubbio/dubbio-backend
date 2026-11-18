import {
  index,
  integer,
  pgEnum,
  snakeCase,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { studiosTable } from "./studios.schema.js";
import { timestampsWithSoftDelete } from "./helpers/columns.helpers.js";

export const voiceStatus = pgEnum("voice_status", [
  "draft",
  "cloning",
  "verification_required",
  "ready",
  "failed",
  "deleting",
]);

export const voicesTable = snakeCase.table(
  "voices",
  {
    id: uuid().defaultRandom().primaryKey(),
    studioId: uuid()
      .notNull()
      .references(() => studiosTable.id, { onDelete: "restrict" }),
    // TODO(auth): add .references(() => usersTable.id) once the better-auth
    // schema exists.
    createdBy: uuid().notNull(),
    name: varchar({ length: 30 }).notNull(),
    sampleDurationMs: integer().notNull(),
    providerVoiceId: varchar().unique(),
    status: voiceStatus().default("draft").notNull(),
    r2SampleKey: varchar().unique().notNull(),
    consentSpeakerName: varchar({ length: 30 }),
    consentConfirmedAt: timestamp({ withTimezone: true }),
    ...timestampsWithSoftDelete,
  },
  (t) => [index().on(t.studioId, t.status)],
);
