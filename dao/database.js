const debug = require('debug')('calendar-server:database');
const path = require('path');

const sqlite3 = require('sqlite3').verbose();
const deferred = require('../utils/deferred');

const { schema } = require('./schema');

const { InternalError, NotFoundError } = require('../utils/errors');

let db;

function nodeToPromise(resolve, reject) {
  return function(err, res) {
    if (err) {
      reject(err);
      return;
    }
    resolve(res);
  };
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
    return new Promise(
      (resolve, reject) => db.all(...args, nodeToPromise(resolve, reject))
    );
  },

  run,

  exec(statement) {
    return new Promise(
      (resolve, reject) => db.exec(statement, nodeToPromise(resolve, reject))
    );
  },

  get(...args) {
    return new Promise(
      (resolve, reject) => db.get(...args, nodeToPromise(resolve, reject))
    );
  },

  update(...args) {
    return safeUpdateOrDelete('update', ...args);
  },

  delete(...args) {
    return safeUpdateOrDelete('delete', ...args);
  }
};

const readyDeferred = deferred();

function init(profileDir, name) {
  const dbPath = path.join(profileDir, name || 'reminders_v2.db');

  // Promise chain is only used in tests. The rest of the code base uses
  // database.ready. This is due to historical reasons: we first decided to use
  // deferred, but multiple database connection done in tests probably hide
  // errors. That why promises are now explicitly returned.. If you are willing
  // to change this function, and now you're reading this comment:
  // please do so :)
  return new Promise((resolve, reject) => {
    console.info(`DB Path ${dbPath}`);
    db = new sqlite3.Database(dbPath, (err) => (err ? reject(err) : resolve()));
  }).then(
    () => promisedDb.exec(schema)
  ).then(
    readyDeferred.resolve,
    (err) => {
      console.error(`Error while initializing the sqlite database. \
database.ready might not be ever resolved. Error: ${err}`);
      readyDeferred.reject(err);
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
