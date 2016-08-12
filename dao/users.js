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

// Given a raw response from a query, extract all groups found in all responses
function extractGroups(users) {
  const _extractedGroups = users.reduce((obj, user) => {
    const groupId = user.group_id;

    if (!obj[groupId]) {
      obj[groupId] = {
        name: user.name,
        groupId: user.group_id
      };
    }

    return obj;
  }, {});

  return Object.keys(_extractedGroups).map((groupId) => {
    const group = _extractedGroups[groupId];

    return group;
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
                user(forename, email, password_hash, is_hub_user)
              VALUES
                (?, ?, ?, ?)
              `,
              newUserObject.forename,
              email,
              password,
              newUserObject.isHubUser ?  1 : 0
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
        return db.all(
          `
          SELECT * FROM user
          JOIN group_membership
            on group_membership.user_id = user.id
          JOIN "group"
            on "group".id = group_membership.group_id
          WHERE user.id = ?`,
          userId);
      })
      .then((users) => {
        if (users.length === 0) {
          throw notFoundError(userId);
        }

        const groups = extractGroups(users);

        return {
          userId: userId,
          forename: users[0].forename,
          email: users[0].email,
          groups: groups
        };
      });
  },
  getUserFromEmail(email) {
    return database.ready
      .then((db) => {
        return db.all(
          `
          SELECT * FROM user
          JOIN group_membership
            on group_membership.user_id = user.id
          JOIN "group"
            on "group".id = group_membership.group_id
          WHERE email = ?`,
          email
        );
      })
      .then((users) => {
        if (users.length === 0) {
          throw notFoundError(`using email as id: ${email}`);
        }

        const groups = extractGroups(users);

        return {
          userId: users[0].id,
          forename: users[0].forename,
          email: users[0].email,
          groups: groups
        };
      });
  },
  getUserByNameInGroup(name, groupId) {
    return database.ready
      .then((db) => {
        return db.all(
          `SELECT * FROM user
        JOIN group_membership
            on group_membership.user_id = user.id
        JOIN "group"
            on "group".id = group_membership.group_id
        WHERE
            "group".id = ? AND
            forename = ?;
          `,
          groupId,
          name
        );
      })
      .then((users) => {
        if (users.length === 0) {
          throw notFoundError(`using email as id: ${email}`);
        }

        return {
          userId: users[0].id,
          forename: users[0].forename,
          email: users[0].email
        };
      });
  }
};
