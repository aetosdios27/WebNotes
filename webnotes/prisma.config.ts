// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // ✅ Use DIRECT_DATABASE_URL for migrations (bypasses PgBouncer)
  // If not set, fallback to DATABASE_URL
  datasource: {
    url: env("DIRECT_DATABASE_URL") ?? env("DATABASE_URL"),
  },
  // Optional: Keep if you use migrate dev
  migrations: {
    path: "prisma/migrations",
  },
});
