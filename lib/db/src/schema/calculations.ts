import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const calculationsTable = pgTable("calculations", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  projectName: text("project_name"),
  engineerName: text("engineer_name"),
  inputs: text("inputs").notNull(),
  results: text("results").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCalculationSchema = createInsertSchema(calculationsTable).omit({ id: true, createdAt: true });
export type InsertCalculation = z.infer<typeof insertCalculationSchema>;
export type Calculation = typeof calculationsTable.$inferSelect;
