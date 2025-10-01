const { createClient } = require("@libsql/client");
const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = require("./config");

const db = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN
});

const initializeDatabase = async () => {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        chat_id TEXT,
        sender_id TEXT,
        sender_name TEXT,
        day TEXT NOT NULL CHECK (day IN ('t3', 't5', 't7')),
        payload TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`
  );
};

const closeDatabase = async () => {
  if (typeof db.close === "function") {
    await db.close();
  }
};

module.exports = {
  db,
  initializeDatabase,
  closeDatabase
};
