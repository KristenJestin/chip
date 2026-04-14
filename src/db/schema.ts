import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const features = sqliteTable("features", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["active", "done", "archived"] })
    .notNull()
    .default("active"),
  stage: text("stage", {
    enum: ["planning", "development", "review", "documentation", "released"],
  })
    .notNull()
    .default("planning"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const phases = sqliteTable("phases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  featureId: text("feature_id")
    .notNull()
    .references(() => features.id),
  order: integer("order").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["todo", "in-progress", "review", "done"] })
    .notNull()
    .default("todo"),
  createdAt: integer("created_at").notNull(),
  startedAt: integer("started_at"),
  completedAt: integer("completed_at"),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phaseId: integer("phase_id")
    .notNull()
    .references(() => phases.id),
  order: integer("order").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["todo", "in-progress", "review", "done"] })
    .notNull()
    .default("todo"),
  type: text("type", { enum: ["feature", "fix", "docs", "test"] })
    .notNull()
    .default("feature"),
  parentTaskId: integer("parent_task_id"),
  createdAt: integer("created_at").notNull(),
  startedAt: integer("started_at"),
  completedAt: integer("completed_at"),
});

export const logs = sqliteTable("logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  featureId: text("feature_id")
    .notNull()
    .references(() => features.id),
  phaseId: integer("phase_id"),
  taskId: integer("task_id"),
  source: text("source"),
  message: text("message").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  featureId: text("feature_id")
    .notNull()
    .references(() => features.id),
  type: text("type", { enum: ["prd", "dev", "review", "docs"] }).notNull(),
  status: text("status", { enum: ["active", "completed", "aborted"] })
    .notNull()
    .default("active"),
  phaseId: integer("phase_id"),
  summary: text("summary"),
  createdAt: integer("created_at").notNull(),
  completedAt: integer("completed_at"),
});

export const findings = sqliteTable("findings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  featureId: text("feature_id")
    .notNull()
    .references(() => features.id),
  sessionId: integer("session_id").references(() => sessions.id),
  pass: text("pass", { enum: ["business", "technical"] }).notNull(),
  severity: text("severity", { enum: ["critical", "major", "minor", "suggestion"] }).notNull(),
  category: text("category", {
    enum: ["security", "convention", "quality", "test", "scope", "correctness"],
  }),
  description: text("description").notNull(),
  taskId: integer("task_id"),
  resolution: text("resolution", { enum: ["fixed", "wontfix", "deferred"] }),
  createdAt: integer("created_at").notNull(),
});

export const criteria = sqliteTable("criteria", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  featureId: text("feature_id")
    .notNull()
    .references(() => features.id),
  phaseId: integer("phase_id"),
  description: text("description").notNull(),
  satisfied: integer("satisfied").notNull().default(0),
  satisfiedAt: integer("satisfied_at"),
  verifiedBy: text("verified_by"),
  createdAt: integer("created_at").notNull(),
});
