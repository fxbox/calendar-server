// const debug = require('debug')('DEBUG:calendar-server:browser/dao/groups');

const database = require('../../../dao/database');

module.exports = {
  getAll() {
    return database.ready
      .then(
        db => db.all(`
          SELECT
            g.*,
            (
              SELECT count(user_id)
              FROM user_group
              WHERE group_id = g.id
            ) user_count,
            (
              SELECT count(ur.reminder_id)
              FROM user_reminder ur, user_group ug
              WHERE ur.user_id = ug.user_id AND ug.group_id = g.id
            ) reminder_count
          FROM "group" g
        `)
      );
  },
};
