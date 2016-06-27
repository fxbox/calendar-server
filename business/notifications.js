const subscriptionsDao = require('../dao/subscriptions');
const remindersDao = require('../dao/reminders');
const mq = require('zmq').socket('push');

const ONE_MINUTE_IN_MS = 60 * 1000;

mq.bindSync('tcp://127.0.0.1:3000');

setInterval(function() {
  const nowInSeconds = Math.floor(Date.now() / 1000);

  remindersDao.findAllDueReminders(nowInSeconds)
    .then(reminders => {
      const remindersPromises = reminders.map(
        reminder => subscriptionsDao.findSubscriptionsByFamily(reminder.family)
          .then(subscriptions => {
            const promises = subscriptions.map(
              subscription => mq.send({ reminder, subscription })
            );
            return Promise.all(promises);
          })
          .then(() => remindersDao.setReminderStatus(reminder.id, 'pending'))
      );

      return Promise.all(remindersPromises);
    });


}, ONE_MINUTE_IN_MS);
