const until = require('until-promise').default;
const { profilePath } = require('../server_manager');

const maxDurationInMs = 5000;
const intervalInMs = 500;

function waitUntilReminderHasStatus(family, id, status) {
  // We connect to the database here, so we don't try to connect to a
  // non-existing one. Test database are often deleted between tests.
  require('../../dao/database').init(profilePath);
  const dao = require('../../dao/reminders');

  return until(
    () => dao.show(family, id),
    (reminder) => reminder.status === status,
    { wait: intervalInMs, duration: maxDurationInMs }
  );
}

module.exports = { waitUntilReminderHasStatus };
