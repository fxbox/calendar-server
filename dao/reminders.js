const debug = require('debug')('DEBUG:calendar-server:dao/reminders');

const database = require('./database');
const { sanitizeUser } = require('./utils');
const { InvalidInputError, NotFoundError } = require('../utils/errors');
const {
  checkPropertyType, checkIsArray
} = require('../utils/object_validator.js');

function notFoundError(id) {
  return NotFoundError.createWithSubject('reminder', { name: 'id', value: id });
}

module.exports = {
  getAllForUserByStart(userId, start, limit) {
    if (typeof start !== 'number') {
      throw new InvalidInputError('invalid_type', '"start" should be a number');
    }

    if (typeof limit !== 'number') {
      throw new InvalidInputError('invalid_type', '"limit" should be a number');
    }

    debug(
      'getAllForUserByStart(userId=%s,start=%s,limit=%s)', userId, start, limit
    );

    let statement = `
      SELECT reminder.* FROM reminder, user_reminder
      WHERE
        user_reminder.reminder_id = reminder.id AND
        user_reminder.user_id = ? AND
        reminder.due >= ?`;

    const statementArgs = [ userId, start ];

    if (limit) { // if limit is 0, it means no limit
      statement += ' LIMIT ?';
      statementArgs.push(limit);
    }

    return database.ready
      .then(db => db.all(statement, ...statementArgs));
  },

  getAllForUserByStatus(userId, status, limit) {
    if (typeof limit !== 'number') {
      throw new InvalidInputError('invalid_type', '"limit" should be a number');
    }

    debug(
      'getAllForUserByStatus(userId=%s, status=%s, limit=%s)',
      userId, status, limit
    );

    let statement = `
      SELECT reminder.* FROM reminder, user_reminder
      WHERE
        user_reminder.reminder_id = reminder.id AND
        user_reminder.user_id = ? AND
        reminder.status = ?`;
    const statementArgs = [ userId, status ];

    if (limit) {
      statement += ' LIMIT ?';
      statementArgs.push(limit);
    }

    return database.ready
      .then(db => db.all(statement, ...statementArgs));
  },

  getAllForGroupByStart(groupId, start, limit) {
    if (typeof start !== 'number') {
      throw new InvalidInputError('invalid_type', '"start" should be a number');
    }

    if (typeof limit !== 'number') {
      throw new InvalidInputError('invalid_type', '"limit" should be a number');
    }

    debug(
      'getAllForUserByStart(groupId=%s,start=%s,limit=%s)',
      groupId, start, limit
    );

    let statement = `
      SELECT reminder.* FROM reminder, user_reminder, user_group
      WHERE
        user_reminder.reminder_id = reminder.id AND
        user_reminder.user_id = user_group.user_id AND
        user_group.group_id = ? AND
        reminder.due >= ?`;

    const statementArgs = [ groupId, start ];

    if (limit) { // if limit is 0, it means no limit
      statement += ' LIMIT ?';
      statementArgs.push(limit);
    }

    return database.ready
      .then(db => db.all(statement, ...statementArgs));
  },

  getAllForGroupByStatus(groupId, status, limit) {
    if (typeof limit !== 'number') {
      throw new InvalidInputError('invalid_type', '"limit" should be a number');
    }

    debug(
      'getAllForGroupByStatus(groupId=%s, status=%s, limit=%s)',
      groupId, status, limit
    );

    let statement = `
      SELECT reminder.* FROM reminder, user_reminder, user_group
      WHERE
        user_reminder.reminder_id = reminder.id AND
        user_reminder.user_id = user_group.user_id AND
        user_group.group_id = ? AND
        reminder.status = ?`;
    const statementArgs = [ groupId, status ];

    if (limit) {
      statement += ' LIMIT ?';
      statementArgs.push(limit);
    }

    return database.ready
      .then(db => db.all(statement, ...statementArgs));
  },

  create(reminder) {
    debug('create(reminder=%o)', reminder);

    checkIsArray(reminder, 'recipients', 1);
    checkPropertyType(reminder, 'action', 'string');
    checkPropertyType(reminder, 'due', 'number');

    return database.ready
      .then((db) => {
        return db.run(
          `INSERT INTO reminder
            (action, created, due, status)
            VALUES (?, ?, ?, ?)`,
            reminder.action,
            Date.now(),
            reminder.due,
            'waiting'
        )
        .then(result => result.lastId)
        .then((reminderId) => {
          // TODO check it works fine for concurrent requests
          const insertPromises = reminder.recipients.map((recipient) => db.run(
              `INSERT INTO user_reminder (user_id, reminder_id)
                VALUES (?, ?)`,
              recipient.id,
              reminderId
            ));

          return Promise.all(insertPromises)
            .then(() => reminderId);
        });
      });
  },

  show(id) {
    debug('show(id=%s)', id);

    const getReminderPromise = database.ready
      .then(db => db.get(
        'SELECT * FROM reminder WHERE id = ?', id
      ));

    return Promise.all([
      getReminderPromise,
      this.getRecipients(id)
    ]).then(([row, recipients]) => {
      if (!row) {
        throw notFoundError(id);
      }

      row.recipients = recipients.map(
        recipient => ({ id: recipient.id, forename: recipient.forename })
      );

      return row;
    });
  },

  getRecipients(id) {
    debug('getRecipients(id=%s)', id);

    return database.ready
      .then(db => db.all(
        `SELECT user.* FROM user, user_reminder ur
         WHERE
           ur.reminder_id = ? AND
           ur.user_id = user.id`,
        id))
      .then(rows => rows.map(sanitizeUser));
  },

  delete(id) {
    debug('delete(id=%s)', id);
    return database.ready
      .then(db => db.delete(
        'FROM reminder WHERE id = ?',
        id
      ));
  },

  update(id, updatedReminder) {
    debug('update(id=%s)', id);

    checkIsArray(updatedReminder, 'recipients', 1);
    checkPropertyType(updatedReminder, 'action', 'string');
    checkPropertyType(updatedReminder, 'due', 'number');

    // Update reminder before recipients
    return database.ready
      .then((db) =>
        db.update(
          `reminder SET
          action = ?,
          due = ?
          WHERE id = ?`,
          updatedReminder.action,
          updatedReminder.due,
          id
        ).then(() => {
          const recipients = updatedReminder.recipients;

          // Build a WHERE clause to remove any recipients not mentioned
          const inClause = '?, '.repeat(recipients.length - 1);
          const whereClause = `user_reminder.user_id NOT IN (${inClause} ?)`;

          const deleteStatement =
            `DELETE FROM user_reminder WHERE ${whereClause}`;
          const deleteArgs = recipients.map(recipient => recipient.id);

          const insertStatement = 'INSERT OR REPLACE INTO user_reminder ' +
            '(user_id, reminder_id) VALUES (?, ?)';

          return db.run(deleteStatement, deleteArgs)
            .then(() =>
              Promise.all(recipients.map(
                (recipient) => db.run(insertStatement, recipient.id, id)
              ))
            );
        })
      );
  },

  updatePartial(id, updatedReminder) {
    debug('updatePartial(id=%s)', id);

    const updates = [];
    const args = [];

    if ('action' in updatedReminder) {
      checkPropertyType(updatedReminder, 'action', 'string');
      updates.push('action = ?');
      args.push(updatedReminder.action);
    }

    if ('due' in updatedReminder) {
      checkPropertyType(updatedReminder, 'due', 'number');
      updates.push('due = ?');
      args.push(updatedReminder.due);
    }

    if (!updates.length) {
      return Promise.reject(new InvalidInputError(
        'empty_input',
        'You need to supply at least one change.'
      ));
    }

    const statement = `reminder SET ${updates.join(', ')} WHERE id = ?`;
    args.push(id);

    return database.ready.then(db => db.update(statement, args));
  },

  deleteRecipient(id, userId) {
    debug('deleteRecipient(id=%s, userId=%s)', id, userId);
    return database.ready
      .then((db) =>
        db.delete(
          `FROM user_reminder
           WHERE
             user_reminder.reminder_id = ? AND
             user_reminder.user_id = ?
          `,
          id, userId
        )
      );
  },

  findAllDueReminders(now) {
    debug('findAllDueReminders(now=%d)', now);
    return database.ready.then(db =>
      db.all(
        'SELECT * FROM reminder WHERE due <= ? AND status = "waiting"',
        now
      )
    );
  },

  setReminderStatus(id, status) {
    debug('setReminderStatus(id=%d, status=%s)', id, status);
    return database.ready.then(db =>
      db.update(
        'reminder SET status = ? WHERE id = ?',
        status, id
      )
    );
  },

  // This method doesn't return an error if the status was in error before.
  setReminderStatusIfNotError(id, status) {
    debug('setReminderStatusIfNotError(id=%d, status=%s)', id, status);
    return database.ready.then(db =>
      db.update(
        'reminder SET status = ? WHERE id = ? AND status != "error"',
        status, id
      )
    );
  }
};
