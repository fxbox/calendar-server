// const debug = require('debug')('DEBUG:calendar-server:browser/dao/users');

const database = require('../../../dao/database');
const { sanitizeUser } = require('../../../dao/utils');

module.exports = {
  getAll() {
    return database.ready
      .then(
        db => db.all(`
          SELECT
            user.*,
            (
              SELECT count(group_id)
              FROM user_group
              WHERE user_id = user.id
            ) group_count,
            (
              SELECT count(reminder_id)
              FROM user_reminder
              WHERE user_id = user.id
            ) reminder_count
          FROM user
        `)
      )
      .then(rows => rows.map(sanitizeUser));
  },
};
