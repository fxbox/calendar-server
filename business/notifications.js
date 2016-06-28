const subscriptionsDao = require('../dao/subscriptions');
const remindersDao = require('../dao/reminders');
const config = require('../config');
const mq = require('zmq').socket('push');

const delay = config.notificationPoll * 1000;

mq.bindSync(`tcp://127.0.0.1:${config.mqPort}`);
console.log(`0mq server listening on port ${config.mqPort}`);

setInterval(function() {
  const nowInSeconds = Math.floor(Date.now() / 1000);

  remindersDao.findAllDueReminders(nowInSeconds)
    .then(reminders => {
      const remindersPromises = reminders.map(
        reminder => subscriptionsDao.findSubscriptionsByFamily(reminder.family)
          .then(subscriptions => {
            const promises = subscriptions.map(
              subscription =>
                mq.send(JSON.stringify({ reminder, subscription }))
            );
            return Promise.all(promises);
          })
          .then(() => remindersDao.setReminderStatus(reminder.id, 'pending'))
      );

      return Promise.all(remindersPromises);
    });


}, delay);
