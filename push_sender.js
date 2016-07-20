process.env.DEBUG_FD = 1; // debug() echoes to stdout instead of stderr

const debug = require('debug')('calendar-server:business/push_sender');
const config = require('./config');
const mq = require('zmq').socket('pull');
const webpush = require('web-push');

const database = require('./dao/database');
const daoReminders = require('./dao/reminders');
const daoSubscriptions = require('./dao/subscriptions');

database.init(config.profile);

if (config.gcmKey) {
  webpush.setGCMAPIKey(config.gcmKey);
} else {
  console.warn('Google\'s GCM API Key has not been defined.');
  console.warn('  Push Notifications won\'t work in Chrome.');
}

const mqUrl = `tcp://127.0.0.1:${config.mqPort}`;

mq.connect(mqUrl);

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
    () => daoReminders.setReminderStatusIfNotError(message.reminder.id, 'done')
  ).catch((err) => {
    if (err.statusCode === 410) { // subscription gone
      const id = message.subscription.id;
      debug('Subscription #%s deleted (was gone)', id);
      return daoSubscriptions.delete(message.reminder.family, id);
    }

    console.error('PushSender: Unhandled error', err);
    return daoReminders.setReminderStatus(message.reminder.id, 'error');
  });
});


process.on('SIGINT', () => {
  console.log('Received SIGINT. Closing push_sender...');
  mq.disconnect(mqUrl);
  database.close()
    .then(() => process.exit())
    .catch((err) => {
      console.error('Error while closing app: ', err);
      process.exit(1);
    });
});
