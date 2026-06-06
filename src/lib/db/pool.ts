import { Pool } from "pg";
import type { PoolClient, QueryResultRow } from "pg";
import { requireDatabaseUrl } from "@/lib/config";

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
};

function shouldUseSsl(connectionString: string) {
  return (
    connectionString.includes("sslmode=require") ||
    connectionString.includes("neon.tech")
  );
}

export function getPool() {
  if (!globalForPg.pgPool) {
    const connectionString = requireDatabaseUrl();

    globalForPg.pgPool = new Pool({
      connectionString,
      ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return globalForPg.pgPool;
}

export async function query<T extends QueryResultRow>(
  sql: string,
  values: unknown[] = [],
) {
  return getPool().query<T>(sql, values);
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
