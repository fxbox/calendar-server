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
  // TODO if start is not specified, we should return "waiting" reminders
  index(family, start = Date.now(), limit = 20) {

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
          (recipient, message, created, due, family)
          VALUES (?, ?, ?, ?, ?)`,
          reminder.recipient,
          reminder.message,
          Date.now(),
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

  findAllDueReminders(now) {
    debug('findAllDueReminders(%d)', now);
    return database.ready.then(db =>
      db.all(
        'SELECT * FROM reminders WHERE due <= ? AND status = "waiting"',
        now
      )
    );
  },

  setReminderStatus(id, status) {
    debug('setReminderStatus(id=%d, status=%s)', id, status);
    return database.ready.then(db =>
      db.run(
        'UPDATE reminders SET status = ? WHERE id = ?',
        status, id
      )
    );
  }
};
