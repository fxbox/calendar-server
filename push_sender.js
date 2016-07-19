process.env.DEBUG_FD = 1; // debug() echoes to stdout instead of stderr

const debug = require('debug')('calendar-server:business/push_sender');
const config = require('./config');
const mq = require('zmq').socket('pull');
const webpush = require('web-push');
const { Status } = require('./model/reminder');

require('./dao/database').init(config.profile);
const daoReminders = require('./dao/reminders');
const daoSubscriptions = require('./dao/subscriptions');

if (config.gcmKey) {
  webpush.setGCMAPIKey(config.gcmKey);
} else {
  console.warn('Google\'s GCM API Key has not been defined.');
  console.warn('  Push Notifications won\'t work in Chrome.');
}

mq.connect(`tcp://127.0.0.1:${config.mqPort}`);

mq.on('message', function(message) {
  Promise.resolve().then(() => {
    message = JSON.parse(message.toString());
    debug('Received message %o', message);
    const subscription = message.subscription.subscription;

    return webpush.sendNotification(
      subscription.endpoint,
      {
        userPublicKey: subscription.keys.p256dh,
        userAuth: subscription.keys.auth,
        payload: JSON.stringify(message.reminder),
      }
    );
  }).then(
    () => daoReminders.setReminderStatusIfNotError(
      message.reminder.id, Status.DONE
    )
  ).catch((err) => {
    if (err.statusCode === 410) { // subscription gone
      const id = message.subscription.id;
      debug('Subscription #%s deleted (was gone)', id);
      return daoSubscriptions.delete(message.reminder.family, id);
    }

    console.error('PushSender: Unhandled error', err);
    return daoReminders.setReminderStatus(message.reminder.id, Status.ERROR);
  });
});
