const chakram = require('chakram');
const expect = chakram.expect;
const mq = require('zmq').socket('pull');

const serverManager = require('./server_manager');
const config = require('./config.js');

describe('notifications', function() {
  const reminder = {
    recipient: 'Jane',
    message: 'Pick up kids at school',
    due: Date.now(),
  };

  const expectedReminder = Object.assign(
    { id: 1, family: 'family_name' },
    reminder
  );

  const subscription = {
    title: 'my_beautiful_subscription',
    subscription: {
      endpoint: 'https://some.endpoint',
      keys: {
        p256dh: 'some_base_64',
        auth: 'some_base_64'
      }
    }
  };
  const expectedSubscription = {
    id: 1,
    family: 'family_name',
    title: subscription.title,
    endpoint: subscription.subscription.endpoint,
    p256dh: subscription.subscription.keys.p256dh,
    auth: subscription.subscription.keys.auth
  };

  const remindersUrl = `${config.apiRoot}/reminders`;
  const subscriptionsUrl = `${config.apiRoot}/subscriptions`;

  const mqSocket = `tcp://127.0.0.1:${serverManager.mqport}`;

  serverManager.inject();

  beforeEach(function() {
    mq.connect(mqSocket);
  });

  afterEach(function() {
    mq.disconnect(mqSocket);
  });

  it('schedules notifications', function() {
    return Promise.all([
      chakram.post(remindersUrl, reminder),
      chakram.post(subscriptionsUrl, subscription),
    ]).then(() =>
      new Promise(resolve => {
        mq.once('message', (message) => {
          resolve(message);
        });
      })
    ).then(message => {
      message = JSON.parse(message.toString());
      expectedReminder.created = message.reminder.created; // hack
      expect(message).deep.equal({
        reminder: expectedReminder,
        subscription: expectedSubscription
      });
    });
  });
});
