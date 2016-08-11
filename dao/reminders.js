const debug = require('debug')('calendar-server:reminders');

const database = require('./database');
const { InvalidInputError, NotFoundError } = require('../utils/errors');
const {
  checkPropertyType, checkIsArray
} = require('../utils/object_validator.js');

function notFoundError(id) {
  return NotFoundError.createWithSubject('reminder', { name: 'id', value: id });
}

function normalizeRecipients(reminders) {
  const _normalizedReminders = reminders.reduce((obj, reminder) => {
    const reminderId = reminder.reminder_id;

    if (obj[reminderId]) {
      obj[reminderId].recipients
        .push({
          userId: reminder.user_id,
          forename: reminder.forename
        });
    } else {
      obj[reminderId] = {
        action: reminder.action,
        created: reminder.created,
        due: reminder.due,
        recipients: [{ userId: reminder.user_id, forename: reminder.forename }]
      };
    }

    return obj;
  }, {});

  return Object.keys(_normalizedReminders)
    .map((key) => Object.assign(_normalizedReminders[key], { id: key }));
}

module.exports = {
  indexByStart(groupId, start, limit) {
    if (typeof start !== 'number') {
      throw new InvalidInputError('invalid_type', '"start" should be a number');
    }

    if (typeof limit !== 'number') {
      throw new InvalidInputError('invalid_type', '"limit" should be a number');
    }

    debug('indexByStart(groupId=%s, start=%s, limit=%s)', groupId, start, limit);

    let statement = `SELECT * FROM reminder
        JOIN users_reminder
            on users_reminder.reminder_id = reminder.id
        JOIN user
            on user.id = users_reminder.user_id
        JOIN group_membership
            on group_membership.user_id = user.id
        JOIN "group"
            on "group".id = group_membership.group_id
        WHERE
            "group".id = ? AND
            reminder.due >= ?`;

    const statementArgs = [ groupId, start ];

    if (limit) { // if limit is 0, it means no limit
      statement += ' LIMIT ?';
      statementArgs.push(limit);
    }

    debug('statement is `%s`', statement);
    return database.ready
      .then(db => db.all(statement, ...statementArgs))
      .then(normalizeRecipients);
  },

  indexByStatus(groupId, status, limit) {
    if (typeof limit !== 'number') {
      throw new InvalidInputError('invalid_type', '"limit" should be a number');
    }

    debug('indexByStatus(family=%s, status=%s)', groupId, status);

    let statement = `SELECT * FROM reminder
        JOIN users_reminder
            on users_reminder.reminder_id = reminder.id
        JOIN user
            on user.id = users_reminder.user_id
        JOIN group_membership
            on group_membership.user_id = user.id
        JOIN "group"
            on "group".id = group_membership.group_id
        WHERE
            "group".id = ? AND
            reminder.status = ?`;
    const statementArgs = [ groupId, status ];

    if (limit) {
      statement += ' LIMIT ?';
      statementArgs.push(limit);
    }

    return database.ready
      .then(db => db.all(statement, ...statementArgs))
      .then(normalizeRecipients);
  },

  create(groupId, reminder) {
    debug('create(grouId=%s, reminder=%o)', groupId, reminder);

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
          const insertPromises = reminder.recipients.map((recipient) => {
            return db.run(
              `INSERT INTO users_reminder (user_id, reminder_id)
                VALUES (?, ?)`,
              recipient.userId,
              reminderId
            );
          });

          // TODO: Response from this method is a little weird
          // the response is the response from the DB abotut the result
          // of the insert into the users_reminder database
          return Promise.all(insertPromises);
        })
      });
  },

  show(groupId, id) {
    debug('show(groupId=%s, id=%s)', groupId, id);
    let statement = `SELECT * FROM reminder
        JOIN users_reminder
            on users_reminder.reminder_id = reminder.id
        JOIN user
            on user.id = users_reminder.user_id
        JOIN group_membership
            on group_membership.user_id = user.id
        JOIN "group"
            on "group".id = group_membership.group_id
        WHERE
            "group".id = ? AND
            reminder.id = ?`;

    return database.ready
      .then(db => db.all(
        statement,
        groupId, id
      ))
      .then((results) => {
        if (results.length === 0) {
          throw notFoundError(id);
        }

        return results;
      })
      .then(normalizeRecipients)
      // Select only the first in the array (should only be one anyway)
      .then(results => results[0]);
  },

  delete(groupId, id) {
    debug('delete(groupId=%s, id=%s)', groupId, id);
    return database.ready
      .then(db => db.delete(
        'FROM reminder WHERE id = ?',
        id
      ));
  },

  update(family, id, updatedReminder) {
    debug('update(family=%s, id=%s)', family, id);

    checkIsArray(updatedReminder, 'recipients', 1);
    checkPropertyType(updatedReminder, 'action', 'string');
    checkPropertyType(updatedReminder, 'due', 'number');

    // Update reminder before recipients
    return database.ready
      .then((db) => {
        return db.update(
          `reminder SET
          action = ?,
          due = ?
          WHERE id = ?`,
          updatedReminder.action,
          updatedReminder.due,
          id
        )
        .then(() => {
          const recipients = updatedReminder.recipients;

          // Build a WHERE clause to remove any recipients not mentioned
          const whereClause = recipients.reduce((clause, recpient) => {
            if (clause.length === 0) {
              return 'users_reminder.user_id != ?';
            } else {
              return `${clause} AND users_reminder.user_id != ?`;
            }
          }, '');

          const deleteStatement = `DELETE FROM users_reminder WHERE ${whereClause}`;
          const deleteArgs = recipients.map(recipient => recipient.userId);

          const insertStatement = 'INSERT OR REPLACE INTO users_reminder (user_id, reminder_id) VALUES (?, ?)';

          return db.run(deleteStatement, deleteArgs)
            .then(() => {
              return Promise.all(recipients.map((recipient) => {
                return db.run(insertStatement, recipient.userId, id);
              }));
            });
        });
      });
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
