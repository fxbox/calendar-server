// const debug = require('debug')('DEBUG:calendar-server:browser/dao/users');

const database = require('../../../dao/database');
module.exports = {
  getAll() {
    return database.ready
      .then(
        db => db.all(`
          SELECT
            reminder.*,
            (
              SELECT count(user_id)
              FROM user_reminder
              WHERE reminder_id = reminder.id
            ) recipients_count
          FROM reminder
        `)
      );
  }
};
