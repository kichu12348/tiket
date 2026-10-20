import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";

const url = new URL(process.env.DATABASE_URL || "");
if (
  !process.argv.includes("--confirm-development-reset") ||
  process.env.NODE_ENV === "production" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
) {
  throw new Error(
    "Reset requires --confirm-development-reset and a local development database.",
  );
}
console.log(
  `Resetting development database ${url.hostname}:${url.port}${url.pathname}`,
);
const client = new SQL(url.toString());
await client.unsafe(
  "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;",
);
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
await client.close();
console.log("Development database reset and migrated.");
