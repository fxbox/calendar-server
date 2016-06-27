const debug = require('debug')('calendar-server:reminders');

const database = require('./database');
const {
  InternalError, InvalidInputError, NotFoundError
} = require('../utils/errors');
const { checkPropertyType } = require('../utils/object_validator.js');

function notFoundError(id) {
  return new NotFoundError(
    'reminder_not_found',
    `The reminder with id ${id} does not exist.`
  );
}

function checkUpdateDelete(mode, id) {
  return result => {
    if (result.changes === 0) {
      throw notFoundError(id);
    }

    if (result.changes > 1) {
      throw new InternalError(
        'database_corrupted',
        `More than 1 reminder has been ${mode} (id=${id}).`
      );
    }
  };
}

module.exports = {
  index(family, start = Math.floor(Date.now() / 1000), limit = 20) {

    // force parameters as integer
    start = +start;
    limit = +limit;

    debug('index family=%s start=%s limit=%s', family, start, limit);

    if (Number.isNaN(start)) {
      throw new InvalidInputError('invalid_type', '"start" should be a number');
    }

    if (Number.isNaN(limit)) {
      throw new InvalidInputError('invalid_type', '"limit" should be a number');
    }

    let statement = 'SELECT * FROM reminders WHERE family = ? AND due > ?';
    const statementArgs = [ family, start ];
    if (limit) {
      statement += ' LIMIT ?';
      statementArgs.push(limit);
    }
    debug('statement is %s', statement);
    return database.ready
      .then(db => db.all(statement, ...statementArgs));
  },

  create(family, reminder) {
    debug('create reminder %o for family %s', reminder, family);
    checkPropertyType(reminder, 'recipient', 'string');
    checkPropertyType(reminder, 'message', 'string');
    checkPropertyType(reminder, 'due', 'number');

    return database.ready
      .then(db => db.run(
        `INSERT INTO reminders
          (recipient, message, due, family)
          VALUES (?, ?, ?, ?)`,
          reminder.recipient,
          reminder.message,
          reminder.due,
          family
      ))
      .then(result => result.lastId);
  },

  show(family, reminderId) {
    debug('show reminder #%s for family %s', reminderId, family);

    return database.ready
      .then(db => db.get(
        'SELECT * FROM reminders WHERE family = ? AND id = ?',
        family, reminderId
      ))
      .then(row => row || Promise.reject(notFoundError(reminderId)));
  },

  delete(family, reminderId) {
    debug('delete reminder #%s for family %s', reminderId, family);
    return database.ready
      .then(db => db.run(
        'DELETE FROM reminders WHERE family = ? AND id = ?',
        family, reminderId
      ))
      .then(checkUpdateDelete('deleted', reminderId));
  },

  update(family, reminderId, updatedReminder) {
    debug('update reminder #%s for family %s', reminderId, family);
    return database.ready
      .then(db => db.run(
        `UPDATE reminders SET
        recipient = ?,
        message = ?,
        due = ?
        WHERE family = ? AND id = ?`,
        updatedReminder.recipient,
        updatedReminder.message,
        updatedReminder.due,
        family, reminderId
      ))
      .then(checkUpdateDelete('updated', reminderId));
  },

  findAllDueReminders(nowInSeconds) {
    return database.ready.then(db =>
      db.all('SELECT * FROM reminders WHERE due > ?', nowInSeconds)
    );
  },

  setReminderStatus(id, status) {
    return database.ready.then(db =>
      db.run(
        'UPDATE reminders SET status = ? WHERE id = ?',
        status, id
      )
    );
  }
};
