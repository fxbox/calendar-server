const debug = require('debug')('DEBUG:calendar-server:dao/users');
const argon2 = require('argon2');

const database = require('./database');
const { sanitizeUser } = require('./utils');
const { NotFoundError, UnauthorizedError } = require('../utils/errors');
const {
  checkPropertyType
} = require('../utils/object_validator.js');

function notFoundError(by, id) {
  return NotFoundError.createWithSubject('user', { name: by, value: id });
}

function cryptHash(plainText) {
  return argon2.generateSalt().then(
    salt => argon2.hash(plainText, salt)
  );
}

function cryptCompare(plainText, hashed) {
  return argon2.verify(hashed, plainText);
}

module.exports = {
  /**
   * Creates a new user in the database.
   *
   * @param {Object} newUserObject The user's information.
   * @param {String} newUserObject.username The user's username for
   * authentication
   * @param {String} newUserObject.phoneNumber The user's phone number for
   * texting
   * @param {String} newUserObject.password The user's password. It will be
   * stored hashed in the database using the argon2 algorithm.
   * @param {String} newUserObject.forename The user's forename (obviously :) )
   * @returns {Promise.<Number>} Resolved with the user id when the user is
   * inserted
   */
  create(newUserObject) {
    debug('create(%o)', newUserObject);
    checkPropertyType(newUserObject, 'username', 'string');
    if (newUserObject.phoneNumber === undefined) {
      newUserObject.phoneNumber = null;
    } else {
      checkPropertyType(newUserObject, 'phoneNumber', 'string');
    }
    checkPropertyType(newUserObject, 'password', 'string');
    checkPropertyType(newUserObject, 'forename', 'string');

    const hashedPasswordPromise = cryptHash(newUserObject.password);

    return hashedPasswordPromise
      .then((password) =>
        database.ready.then(db =>
          db.run(
            `
            INSERT INTO
              user(forename, username, phone_number, password_hash)
            VALUES
              (?, ?, ?, ?)
            `,
            newUserObject.forename,
            newUserObject.username,
            newUserObject.phoneNumber,
            password
          )
        )
      )
      .then(result => result.lastId);
  },

  /**
   * This is the function to check a user's password.
   * @param {String} username Username to identify the user
   * @param {String} tentativePassword Input password to check
   * @returns {Promise<User>} The Promise is resolved with a user object if the
   * user exists and the password is correct. The user object is never undefined
   * or null if the promise is resolved.
   */
  authenticate(username, tentativePassword) {
    debug('authenticate(username=%s)', username);
    return database.ready
      .then(db => db.get(
        'SELECT * FROM user WHERE username = ?',
        username
      ))
      .then(user => {
        if (!user) {
          throw notFoundError('username', username);
        }

        return cryptCompare(tentativePassword, user.password_hash)
          .then(isCorrect => {
            if (isCorrect) {
              return sanitizeUser(user);
            }
            throw new UnauthorizedError(
              'invalid_credentials', 'Invalid credentials were specified'
            );
          });
      });
  },
  getById(userId) {
    debug('getById(userId=%s)', userId);
    return database.ready
      .then((db) => db.get(
        'SELECT * FROM user WHERE user.id = ?',
        userId
      ))
      .then((user) => {
        if (!user) {
          throw notFoundError('id', userId);
        }

        return sanitizeUser(user);
      });
  },
  getGroupsForUser(userId) {
    debug('getGroupsForUser(userId=%s)', userId);
    return database.ready
      .then((db) => db.all(`
        SELECT DISTINCT "group".* FROM "group", user_group
        WHERE "group".id = user_group.group_id AND user_group.user_id = ?
      `, userId)
      );
  },
  getRelationsForUser(userId) {
    debug('getRelationsForUser(userId=%s)', userId);
    return database.ready
      .then((db) => db.all(`
        SELECT DISTINCT user.*
        FROM user, user_group ug1, user_group ug2
        WHERE
        user.id = ug1.user_id AND ug1.group_id = ug2.group_id AND
        user.id != ug2.user_id AND ug2.user_id = ?
      `, userId)
      )
      .then(users => users.map(sanitizeUser));
  },
  getByUsername(username) {
    debug('getByUsername(username=%s)', username);

    return database.ready
      .then((db) => {
        return db.get(
          'SELECT * FROM user WHERE username = ?',
          username
        );
      })
      .then((user) => {
        if (!user) {
          throw notFoundError('username', username);
        }

        return sanitizeUser(user);
      });
  },
  getByNameAndGroup(name, groupId) {
    debug('getByNameAndGroup(name=%s, groupId=%s)', name, groupId);

    return database.ready
      .then((db) => db.get(
        `SELECT user.* FROM user, user_group ug
          WHERE 
            ug.user_id = user.id AND
            ug.group_id = ? AND
            user.forename = ?;
        `,
        groupId,
        name
      ))
      .then((user) => {
        if (!user) {
          throw notFoundError('name and group', `${name} and ${groupId}`);
        }

        return sanitizeUser(user);
      });
  },
  delete(id) {
    debug('delete(id=%s)', id);
    return database.ready
      .then(db => db.delete('FROM user WHERE id = ?', id));
  }
};
