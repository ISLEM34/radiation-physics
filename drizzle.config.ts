import { defineConfig } from "drizzle-kit";
import "dotenv/config";

// يقرأ DATABASE_URL من متغيرات البيئة (مع قيمة افتراضية للتطوير المحلي)
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
