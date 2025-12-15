import { postgres } from "@prisma/adapter-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const adapter = postgres(pool);
