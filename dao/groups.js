const debug = require('debug')('DEBUG:calendar-server:dao/groups');

const database = require('./database');
const { NotFoundError } = require('../utils/errors');
const { checkPropertyType } = require('../utils/object_validator.js');

function notFoundError(id) {
  return NotFoundError.createWithSubject('group', { name: 'id', value: id });
}

module.exports = {
  create(group) {
    debug('create(group=%o)', group);
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
  get(groupId) {
    debug('get(id=%s)', groupId);
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
    debug('delete(id=%s)', groupId);
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
    debug('getAllUsersInGroup(id=%s)', groupId);
    return database.ready
      .then((db) =>
        db.all(`
          SELECT user.*, user_group.is_admin FROM user
            JOIN user_group
              on user_group.user_id = user.id
            JOIN "group"
              on "group".id = user_group.group_id
            WHERE
              "group".id = ?
          `,
          groupId
        )
      ).then(users => users.map(user => {
        delete user.password_hash;
        return user;
      }));
  },
  getCommonGroups(user1, user2) {
    debug('getCommonGroups(user1=%s, user2=%s)', user1, user2);
    return database.ready
      .then(db => db.all(
        `
        SELECT ug1.group_id group_id FROM user_group ug1, user_group ug2
        WHERE
        ug1.user_id = ? AND ug2.user_id = ? AND
        ug1.group_id = ug2.group_id
        `,
        user1, user2
      ))
      .then(rows => rows.map(row => row.group_id));
  },
  isUserInGroup(groupId, userId) {
    debug('isUserInGroup(groupId=%s, userId=%s)', groupId, userId);
    return database.ready
      .then(db => db.get(
        `
        SELECT COUNT(*) count FROM user_group ug
        WHERE ug.user_id = ? AND ug.group_id = ?
        `,
        userId, groupId
      ))
      .then(row => row.count > 0);
  },
  isUserAdminInGroup(groupId, userId) {
    debug('isUserAdminInGroup(groupId=%s, userId=%s)', groupId, userId);
    return database.ready
      .then(db => db.get(
        `
        SELECT is_admin FROM user_group ug
        WHERE ug.user_id = ? AND ug.group_id = ?
        `,
        userId, groupId
      ))
      .then(row => row && row.is_admin > 0);

  },
  addUserToGroup(groupId, userId, isAdmin = false) {
    debug(
      'addUserToGroup(groupId=%s, userId=%s, isAdmin=%s)',
      groupId, userId, isAdmin
    );
    return database.ready
      .then(db => (
        db.run(
          `
          INSERT INTO
            user_group(user_id, group_id, is_admin)
          VALUES (?, ?, ?)
          `,
          userId,
          groupId,
          isAdmin
        ))
      );
  },
  removeUserFromGroup(groupId, userId) {
    debug('removeUserFromGroup(groupId=%s, userId=%s)', groupId, userId);
    return database.ready
      .then(db => (
        db.run(
          `
          DELETE FROM user_group
          WHERE
          user_group.user_id = ? AND
          user_group.group_id = ?
          `,
          userId,
          groupId
        )
      ));
  }
};

