import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { userTypeEnum } from "./enums.schema";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash"),
  googleId: varchar("google_id", { length: 255 }).unique(),
  avatarUrl: text("avatar_url"),
  type: userTypeEnum("type").notNull().default("individual"),
  description: text("description"),
  isVerified: boolean("is_verified").default(false),
  otpHash: text("otp_hash"),
  otpExpiresAt: timestamp("otp_expires_at"),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

