// This file configures Prisma with connection pooling support
// For production deployments, use DATABASE_URL for pooled connections
// and DATABASE_DIRECT_URL for migrations
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DATABASE_URL for queries (can be pooled connection)
    url: process.env["DATABASE_URL"],
  },
});
