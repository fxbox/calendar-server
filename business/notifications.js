const debug = require('debug')('calendar-server:business/notifications');
const subscriptionsDao = require('../dao/subscriptions');
const remindersDao = require('../dao/reminders');
const config = require('../config');
const mq = require('zmq').socket('push');

const delay = config.notificationPoll;

mq.bindSync(`tcp://127.0.0.1:${config.mqPort}`);
console.log(`0mq server listening on port ${config.mqPort}`);

setInterval(function() {
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
            const promises = subscriptions.map(subscription => {
              const message = { reminder, subscription };
              return mq.send(JSON.stringify(message));
            });
            return Promise.all(promises);
          })
          .then(() => remindersDao.setReminderStatus(reminder.id, 'pending'))
      );

      return Promise.all(remindersPromises);
    }).catch(err => {
      // Bubble up errors, otherwise they are silently dropped
      console.error(err);
    });
}, delay);
