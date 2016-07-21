const debug = require('debug')('calendar-server:database');
const path = require('path');

const sqlite3 = require('sqlite3').verbose();
const deferred = require('../utils/deferred');

const { InternalError, NotFoundError } = require('../utils/errors');

let db;

function run(...args) {
  return new Promise((resolve, reject) => {
    // Cannot use arrow function because `this` is set by the caller
    db.run(...args, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastId: this.lastID, changes: this.changes });
    });
  });
}

function safeUpdateOrDelete(mode, ...args) {
  args[0] = `${mode} ${args[0]}`;
  debug('statement: `%s`', args[0]);

  return run(...args).then((result) => {
    if (result.changes === 0) {
      throw new NotFoundError(
        'no_row_changed',
        `Nothing was ${mode}d in the database. Statement was: \`${args[0]}\``
      );
    }

    if (result.changes > 1) {
      throw new InternalError(
        'database_corrupted',
        `More than 1 row has been ${mode}d.`
      );
    }
  });
}

const promisedDb = {
  all(...args) {
    return new Promise((resolve, reject) => {
      db.all(...args, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  },

  run,

  get(...args) {
    return new Promise((resolve, reject) => {
      db.get(...args, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  },

  update(...args) {
    return safeUpdateOrDelete('update', ...args);
  },

  delete(...args) {
    return safeUpdateOrDelete('delete', ...args);
  }
};

const readyDeferred = deferred();

const createStatements = [`
  CREATE TABLE IF NOT EXISTS reminders
  (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family TEXT,
    recipients TEXT,
    action TEXT,
    created INTEGER NOT NULL, -- in milliseconds
    due INTEGER NOT NULL, -- in milliseconds
    status TEXT DEFAULT 'waiting'
  )
`, `
  CREATE TABLE IF NOT EXISTS subscriptions
  (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family TEXT,
    title TEXT,
    endpoint TEXT UNIQUE,
    p256dh TEXT,
    auth TEXT
  )
`];

function init(profileDir) {
  const dbPath = path.join(profileDir, 'reminders.db');

  // Promise chain is only used in tests. The rest of the code base uses
  // database.ready. This is due to historical reasons: we first decided to use
  // deferred, but multiple database connection done in tests probably hide
  // errors. That why promises are now explicitly returned.. If you are willing
  // to change this function, and now you're reading this comment:
  // please do so :)
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => (err ? reject(err) : resolve()));
  }).then(() => {
    const promises = createStatements.map(
      statement => promisedDb.run(statement)
    );
    return Promise.all(promises);
  }).then(readyDeferred.resolve, readyDeferred.reject)
    .catch((err) => {
      console.error(`Error while initializing the sqlite database. \
database.ready might not be ever resolved. Error: ${err}`);
      throw err;
    });
}

function close() {
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

module.exports = {
  init,
  close,
  ready: readyDeferred.promise.then(() => promisedDb)
};
