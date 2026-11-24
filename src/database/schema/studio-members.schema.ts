import {
  index,
  pgEnum,
  primaryKey,
  snakeCase,
  uuid,
} from "drizzle-orm/pg-core";
import { userTable } from "./auth.schema.js";
import { studiosTable } from "./studios.schema.js";
import { timestamps } from "./helpers/columns.helpers.js";

export const memberRole = pgEnum("member_role", ["owner", "editor", "viewer"]);

export const studioMembersTable = snakeCase.table(
  "studio_members",
  {
    studioId: uuid()
      .notNull()
      .references(() => studiosTable.id),
    userId: uuid()
      .notNull()
      .references(() => userTable.id),
    role: memberRole().notNull(),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.studioId, t.userId] }),
    index().on(t.userId),
  ],
);
