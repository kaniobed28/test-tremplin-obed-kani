import mysql from "mysql2/promise";
import type { ContactRequest } from "./schema";

/**
 * Connection settings default to the docker-compose service, so the project
 * runs with `docker compose up -d && npm run dev` and no .env file.
 *
 * DATABASE_URL takes precedence when set: hosted providers hand out a single
 * `mysql://user:password@host:port/database` string, and that is what the
 * online demo runs on.
 */
function buildConfig(): mysql.PoolOptions {
  const base: mysql.PoolOptions = {
    waitForConnections: true,
    // Deliberately small: serverless opens a pool per instance, and free
    // MySQL tiers cap total connections low.
    connectionLimit: Number(process.env.DB_POOL_SIZE ?? 3),
    supportBigNumbers: true,
    dateStrings: true,
    // Hosted MySQL requires TLS; docker-compose on localhost does not.
    ...(process.env.DB_SSL === "true"
      ? { ssl: { rejectUnauthorized: true } }
      : {}),
  };

  if (process.env.DATABASE_URL) {
    return { ...base, uri: process.env.DATABASE_URL };
  }

  return {
    ...base,
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "verysecurepassword",
    database: process.env.DB_NAME ?? "majordhom",
  };
}

/**
 * Next.js hot-reloads modules in dev, which would open a new pool on every
 * reload until MySQL refuses connections. Cache it on globalThis.
 */
const globalForDb = globalThis as unknown as {
  pool?: mysql.Pool;
  schemaReady?: Promise<void>;
};

export function getPool(): mysql.Pool {
  if (!globalForDb.pool) {
    globalForDb.pool = mysql.createPool(buildConfig());
  }
  return globalForDb.pool;
}

/**
 * Creates the tables on first use. Idempotent, and memoised so concurrent
 * requests don't race to run the DDL.
 */
export function ensureSchema(): Promise<void> {
  if (!globalForDb.schemaReady) {
    globalForDb.schemaReady = (async () => {
      const pool = getPool();

      await pool.query(`
        CREATE TABLE IF NOT EXISTS contact_requests (
          id           INT AUTO_INCREMENT PRIMARY KEY,
          civility     ENUM('mme', 'm')                     NOT NULL,
          last_name    VARCHAR(80)                          NOT NULL,
          first_name   VARCHAR(80)                          NOT NULL,
          email        VARCHAR(150)                         NOT NULL,
          phone        VARCHAR(20)                          NULL,
          request_type ENUM('visite', 'rappel', 'photos')   NOT NULL,
          message      TEXT                                 NOT NULL,
          created_at   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_contact_requests_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS availabilities (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          request_id INT         NOT NULL,
          day        VARCHAR(10) NOT NULL,
          hour       TINYINT     NOT NULL,
          minute     TINYINT     NOT NULL,
          CONSTRAINT fk_availabilities_request
            FOREIGN KEY (request_id) REFERENCES contact_requests(id)
            ON DELETE CASCADE,
          INDEX idx_availabilities_request (request_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })();
  }
  return globalForDb.schemaReady;
}

export type StoredRequest = {
  id: number;
  civility: "mme" | "m";
  last_name: string;
  first_name: string;
  email: string;
  phone: string | null;
  request_type: "visite" | "rappel" | "photos";
  message: string;
  created_at: string;
  availabilities: Array<{ day: string; hour: number; minute: number }>;
};

/**
 * Reads back the saved requests, most recent first, each with its slots.
 *
 * Two queries then a group in JS, rather than one JOIN: a JOIN would repeat
 * every request column once per availability, and we would have to
 * de-duplicate it here anyway.
 */
export async function listContactRequests(limit = 50): Promise<StoredRequest[]> {
  await ensureSchema();
  const pool = getPool();

  // `query` (not `execute`): LIMIT placeholders and `IN (?)` array expansion
  // are handled by the driver's escaping, not by MySQL prepared statements.
  const [requests] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, civility, last_name, first_name, email, phone,
            request_type, message, created_at
       FROM contact_requests
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    [Math.max(1, Math.min(limit, 200))],
  );

  if (requests.length === 0) return [];

  const [slots] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT request_id, day, hour, minute
       FROM availabilities
      WHERE request_id IN (?)
      ORDER BY id`,
    [requests.map((r) => r.id)],
  );

  const byRequest = new Map<number, StoredRequest["availabilities"]>();
  for (const slot of slots) {
    const list = byRequest.get(slot.request_id) ?? [];
    list.push({ day: slot.day, hour: slot.hour, minute: slot.minute });
    byRequest.set(slot.request_id, list);
  }

  return requests.map((r) => ({
    ...(r as Omit<StoredRequest, "availabilities">),
    availabilities: byRequest.get(r.id) ?? [],
  }));
}

/**
 * Persists a request and its availabilities atomically — a request must never
 * land without the slots the visitor picked.
 */
export async function insertContactRequest(
  data: ContactRequest,
): Promise<number> {
  await ensureSchema();
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO contact_requests
         (civility, last_name, first_name, email, phone, request_type, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.civility,
        data.lastName,
        data.firstName,
        data.email,
        data.phone === "" ? null : data.phone,
        data.requestType,
        data.message,
      ],
    );

    const requestId = result.insertId;

    if (data.availabilities.length > 0) {
      await connection.query(
        `INSERT INTO availabilities (request_id, day, hour, minute) VALUES ?`,
        [
          data.availabilities.map((slot) => [
            requestId,
            slot.day,
            slot.hour,
            slot.minute,
          ]),
        ],
      );
    }

    await connection.commit();
    return requestId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
