import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { ContactRequest } from "./schema";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "contacts.db");

/**
 * Next.js hot-reloads modules in dev, which would open a new SQLite handle on
 * every reload. Cache the connection on globalThis so we keep exactly one.
 */
const globalForDb = globalThis as unknown as {
  db?: Database.Database;
};

function createConnection(): Database.Database {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH);

  // WAL lets reads run concurrently with the write of a form submission.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      civility     TEXT    NOT NULL CHECK (civility IN ('mme', 'm')),
      last_name    TEXT    NOT NULL,
      first_name   TEXT    NOT NULL,
      email        TEXT    NOT NULL,
      phone        TEXT,
      request_type TEXT    NOT NULL CHECK (request_type IN ('visite', 'rappel', 'photos')),
      message      TEXT    NOT NULL,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS availabilities (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES contact_requests(id) ON DELETE CASCADE,
      day        TEXT    NOT NULL,
      hour       INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
      minute     INTEGER NOT NULL CHECK (minute BETWEEN 0 AND 59)
    );

    CREATE INDEX IF NOT EXISTS idx_availabilities_request
      ON availabilities(request_id);
    CREATE INDEX IF NOT EXISTS idx_contact_requests_created
      ON contact_requests(created_at DESC);
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.db) globalForDb.db = createConnection();
  return globalForDb.db;
}

/**
 * Persists a request and its availabilities atomically — a request must never
 * land without the slots the visitor picked.
 */
export function insertContactRequest(data: ContactRequest): number {
  const db = getDb();

  const insertRequest = db.prepare(`
    INSERT INTO contact_requests
      (civility, last_name, first_name, email, phone, request_type, message)
    VALUES
      (@civility, @lastName, @firstName, @email, @phone, @requestType, @message)
  `);

  const insertAvailability = db.prepare(`
    INSERT INTO availabilities (request_id, day, hour, minute)
    VALUES (?, ?, ?, ?)
  `);

  const run = db.transaction((payload: ContactRequest) => {
    const { lastInsertRowid } = insertRequest.run({
      civility: payload.civility,
      lastName: payload.lastName,
      firstName: payload.firstName,
      email: payload.email,
      phone: payload.phone === "" ? null : payload.phone,
      requestType: payload.requestType,
      message: payload.message,
    });

    const requestId = Number(lastInsertRowid);
    for (const slot of payload.availabilities) {
      insertAvailability.run(requestId, slot.day, slot.hour, slot.minute);
    }
    return requestId;
  });

  return run(data);
}
