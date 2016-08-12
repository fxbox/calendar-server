const debug = require('debug')('calendar-server:reminders');
const bcrypt = require('bcrypt');

const database = require('./database');
const { NotFoundError } = require('../utils/errors');
const {
  checkPropertyType, checkIsArray
} = require('../utils/object_validator.js');

function notFoundError(id) {
  return NotFoundError.createWithSubject('user', { name: 'id', value: id });
}

const BCRYPT_SALT_ROUNDS = 10;
const SHA_HASH_SALT = 'todochangeme';

function bcryptHash(plainText) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(plainText, BCRYPT_SALT_ROUNDS, function(err, hash) {
      if (err) {
        reject(err);
        return;
      }

      resolve(hash);
    });
  });
}

function bcryptCompare(plainText, hashed) {
  return new Promise((resolve, reject) => {
    bcrypt.compare(plainText, hashed, function(err, result) {
      if (err) {
        reject(err);
        return;
      }

      resolve(result);
    });
  });
}

module.exports = {
  create(newUserObject) {
    checkPropertyType(newUserObject, 'emailAddress', 'string');
    checkPropertyType(newUserObject, 'password', 'string');
    checkPropertyType(newUserObject, 'forename', 'string');

    const hashedPasswordPromise = bcryptHash(newUserObject.password);

    return hashedPasswordPromise
      .then((password) => {
        const email = newUserObject.emailAddress;

        return database.ready
          .then((db) => {
            return db.run(
              `
              INSERT INTO
                user(forename, email, password_hash)
              VALUES
                (?, ?, ?)
              `,
              newUserObject.forename,
              email,
              password
            );
          });
      });
  },
  authenticateUser(authObject) {
    checkPropertyType(authObject, 'emailAddress', 'string');
    checkPropertyType(authObject, 'password', 'string');

    return database.ready
      .then((db) => {
        const email = authObject.emailAddress;
        return db.get(
          'SELECT password_hash FROM user WHERE email = ?',
          email
        );
      })
      .then((result) => {
        return bcryptCompare(authObject.password, result.password_hash);
      });
  },
  getUserFromUserId(userId) {
    return database.ready
      .then((db) => {
        return db.get(
          'SELECT email, forename FROM user WHERE id = ?',
          userId);
      })
      .then((user) => {
        user.userId = userId;
        return user;
      });
  },
  getUserFromEmail(email) {
    return database.ready
      .then((db) => {
        return db.get(
          'SELECT email, forename, id as userId FROM user WHERE email = ?',
          email
        );
      });
  }
};
