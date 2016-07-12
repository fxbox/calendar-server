const debug = require('debug')('calendar-server:database');
const path = require('path');

const sqlite3 = require('sqlite3').verbose();
const deferred = require('../utils/deferred');

const { InternalError, NotFoundError } = require('../utils/errors');

const DB_VERSION = 1;

let db;

const versionCreateStatement = `
  CREATE TABLE IF NOT EXISTS version
  (
    version INTEGER DEFAULT 0
  )
`;

function shouldMigrate() {
  return new Promise((resolve) => {
    db.serialize(() => {
      db.run(versionCreateStatement);
      db.get('SELECT version FROM version', (err, row) => {
        if (err) {
          console.error('Error while selecting the sqlite database', err);
          return;
        }

        let version;
        if (row) {
          version = row.version;
        }

        resolve(version < DB_VERSION);
      });
    });
  });
}

function updateVersion() {
  db.serialize(() => {
    db.run('DELETE FROM version');
    db.run('INSERT INTO version (version) VALUES (?)', DB_VERSION);
  });
}

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
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error while opening the sqlite database', err);
    }
  });

  shouldMigrate().then(shouldMigrate => {
    // we don't care
    debug('Should we migrate ? `%s`', shouldMigrate);
    return updateVersion();
  }).then(() => {
    const promises = createStatements.map(
      statement => promisedDb.run(statement)
    );
    return Promise.all(promises);
  }).then(readyDeferred.resolve, readyDeferred.reject);
}

module.exports = {
  init,
  ready: readyDeferred.promise.then(() => promisedDb)
};
