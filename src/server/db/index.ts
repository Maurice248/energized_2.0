import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { env } from "@/env";
import * as schema from "./schema";

// Neon Pool uses WebSockets; Node needs a `WebSocket` implementation (see `ws`).
neonConfig.webSocketConstructor = ws;

const globalForPool = globalThis as unknown as { neonPool?: Pool };

const pool =
  globalForPool.neonPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    // Cap concurrent WebSockets: many parallel Drizzle queries (e.g. admin overview)
    // + layout can exceed Neon/proxy tolerance and yield "socket hang up".
    max: 6,
    connectionTimeoutMillis: 15_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPool.neonPool = pool;
}

export const db = drizzle(pool, { schema, casing: "snake_case" });

export type DB = typeof db;
