const debug = require('debug')('calendar-server:business/notifications');
const subscriptionsDao = require('../dao/subscriptions');
const remindersDao = require('../dao/reminders');
const config = require('../config');
const mq = require('zmq').socket('push');

const delay = config.notificationPoll;
const mqUrl = `tcp://127.0.0.1:${config.mqPort}`;

let interval;

function sendReminderAndUpdateDatabase(reminder, subscriptions) {
  if (subscriptions.length === 0) {
    const statusName = 'error-no-subscription';
    debug('Family "%s" has no subscription, marking reminder #%s as "%s"',
      reminder.family, reminder.id, statusName
    );
    return remindersDao.setReminderStatus(reminder.id, statusName);
  }

  const promises = subscriptions.map(subscription => {
    const message = { reminder, subscription };
    return mq.send(JSON.stringify(message));
  });

  return Promise.all(promises)
    .then(() => remindersDao.setReminderStatus(reminder.id, 'pending'));
}

function sendNewNotifications() {
  const now = Date.now();
  if (debug.enabled) {
    debug(
      'Polling reminders that are due at %d (%s)',
      now, new Date(now)
    );
  }

  remindersDao.findAllDueReminders(now)
    .then(reminders => {
      debug('Found reminders: %o', reminders);
      const remindersPromises = reminders.map(
        reminder => subscriptionsDao.findSubscriptionsByFamily(reminder.family)
          .then(subscriptions => {
            debug('Found subscriptions: %o', subscriptions);
            return sendReminderAndUpdateDatabase(reminder, subscriptions);
          })
        );
      return Promise.all(remindersPromises);
    }).catch(err => {
      // Bubble up errors, otherwise they are silently dropped
      console.error(err);
    });
}

function start() {
  mq.bindSync(mqUrl);
  console.log(`0mq server listening on port ${config.mqPort}`);
  interval = setInterval(sendNewNotifications, delay);
}

function stop() {
  return new Promise((resolve, reject) => {
    if (interval) {
      clearInterval(interval);
    }
    mq.unbind(mqUrl, (err) => (err ? reject(err) : resolve()));
  });
}

module.exports = { start, stop };
