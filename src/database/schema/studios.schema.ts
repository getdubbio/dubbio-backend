import { uuid, varchar, snakeCase } from "drizzle-orm/pg-core";
import { timestamps } from "./helpers/columns.helpers.js";

export const studiosTable = snakeCase.table("studios", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull(),
  ...timestamps,
});
