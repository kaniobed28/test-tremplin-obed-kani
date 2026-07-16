import mysql from "mysql2/promise";
import type { ContactRequest } from "./schema";

/**
 * Connection settings default to the docker-compose service, so the project
 * runs with `docker compose up -d && npm run dev` and no .env file.
 */
const config = {
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "verysecurepassword",
  database: process.env.DB_NAME ?? "majordhom",
};

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
    globalForDb.pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      // Availabilities are inserted with a multi-row VALUES list, so the
      // driver must keep numbers as numbers rather than strings.
      supportBigNumbers: true,
      dateStrings: true,
    });
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
