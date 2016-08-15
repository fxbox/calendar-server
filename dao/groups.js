// const debug = require('debug')('calendar-server:reminders');

const database = require('./database');
const { NotFoundError } = require('../utils/errors');
const { checkPropertyType } = require('../utils/object_validator.js');

function notFoundError(id) {
  return NotFoundError.createWithSubject('group', { name: 'id', value: id });
}

module.exports = {
  create(group) {
    checkPropertyType(group, 'name', 'string');

    return database.ready
      .then(db => (
        db.run(
          `
          INSERT INTO
            "group"(name)
          VALUES (?)
          `,
          group.name
        )
      ))
      .then(result => result.lastId);
  },
  getGroup(groupId) {
    return database.ready
      .then(db => (
        db.get(
          `
          SELECT * FROM "group" WHERE "group".id = ?
          `,
          groupId
        )))
      .then((result) => {
        if (result === undefined) {
          throw notFoundError(groupId);
        }
        return result;
      });
  },
  delete(groupId) {
    return database.ready
      .then(db => (
        db.run(
          `
          DELETE FROM "group"
          WHERE
          "group".id = ?
          `,
          groupId
        )
      ));
  },
  getAllUsersInGroup(groupId) {
    return database.ready
      .then((db) => {
        return db.all(
          `SELECT * FROM user
        JOIN group_membership
            on group_membership.user_id = user.id
        JOIN "group"
            on "group".id = group_membership.group_id
        WHERE
            "group".id = ?;
          `,
          groupId
        );
      })
      .then((users) => {
        return users.map((user) => ({
          userId: user.user_id,
          forename: user.forename
        }));
      });
  },
  addUserToGroup(groupId, userId) {
    return database.ready
      .then(db => (
        db.run(
          `
          INSERT INTO
            group_membership(user_id, group_id)
          VALUES (?, ?)
          `,
          userId,
          groupId
        ))
      );
  },
  removeUserFromGroup(groupId, userId) {
    return database.ready
      .then(db => (
        db.run(
          `
          DELETE FROM group_membership
          WHERE
          group_membership.user_id = ? AND
          group_membership.group_id = ?
          `,
          userId,
          groupId
        )
      ));
  }
};

