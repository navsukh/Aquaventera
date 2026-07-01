// server/db.js — compatibility shim for legacy imports
// The active application uses the PostgreSQL-backed implementation in db/database.js.
const { getDb, initDb, transaction } = require('../db/database');

module.exports = {
  db: getDb(),
  getDb,
  initDb,
  transaction
};
