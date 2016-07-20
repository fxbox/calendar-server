const until = require('until-promise').default;
const daoReminders = require('../../dao/reminders');


const maxDurationInMs = 5000;
const intervalInMs = 500;

function waitUntilReminderHasStatus(family, id, status) {
  // Please make sure a database connection is already set in the process. No
  // connection is up when until() calls dao.show() only once. This is explained
  // by database.ready() never being resolved. To solve this, call
  // database.init() in beforeEach() of your suite. before() alone won't likely
  // work because database is oftenly deleted after each test.
  return until(
    () => daoReminders.show(family, id),
    (reminder) => reminder.status === status,
    { wait: intervalInMs, duration: maxDurationInMs }
  );
}

module.exports = { waitUntilReminderHasStatus };
