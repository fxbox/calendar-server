const until = require('until-promise').default;
const { profilePath } = require('../server_manager');


const maxDurationInMs = 5000;
const intervalInMs = 500;

const debug = require('debug')('calendar-server:wait');


function waitUntilReminderHasStatus(family, id, status) {
  require('../../dao/database').init(profilePath);
  const dao = require('../../dao/reminders');

  debug('here');
  return until(
    () => dao.show(family, id),
    (reminder) => reminder.status === status,
    { wait: intervalInMs, duration: maxDurationInMs }
  );
}

module.exports = { waitUntilReminderHasStatus };
