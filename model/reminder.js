const { Enum } = require('enumify');

class Status extends Enum {
  toString() {
    return this.name.toLowerCase();
  }
}

Status.initEnum([
  'WAITING', // Waiting to be due
  'PENDING', // Reminder is due, we're handling notifications
  'DONE',    // Notifications was correctly sent
  'NO_SUBSCRIPTION_WHEN_DUE', // There was no device to send the reminder to.
  'ERROR',   // Something went wrong. Not every notifications was sent.
]);

module.exports = { Status };
