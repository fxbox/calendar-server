const sinon = require('sinon');
const path = require('path');

const mq = require('zmq').socket('push');
const mqPort = 4001;

const config = require('../config.js');
config.mqPort = mqPort;
config.profile = path.join(__dirname, '../profiles/test');

const until = require('until-promise').default;
const dao = require('../dao/reminders');


function waitUntilReminderHasStatus(family, id, status) {
  const maxDurationInMs = 5000;
  const intervalInMs = 500;
  return until(
    () => dao.show(family, id),
    (reminder) => reminder.status === status,
    { wait: intervalInMs, duration: maxDurationInMs }
  );
}


describe('push notification sender', function() {
  let webpush;
  const mqUrl = `tcp://127.0.0.1:${mqPort}`;


  before(() => {
    mq.bindSync(mqUrl);
    webpush = require('web-push');
    sinon.stub(webpush, 'sendNotification');

    require('../push_sender'); // starts up
  });

  after(() => {
    mq.unbindSync(mqUrl);
    webpush.sendNotification.restore();
  });

  it('should emit push notifications on new messages', function*() {
    this.timeout(10000);

    const family = 'family_name';
    const id = 1;
    const message = {
      reminder: {
        id: 1,
        recipients: ['John'],
        action: 'Pick up kids at school',
        created: 1466588359000,
        due: 1466613000000,
        status: 'pending',
        family
      },
      subscription: {
        id,
        family,
        title: 'Firefox 47 on Linux',
        subscription: {
          endpoint: 'https://an.end.point',
          keys: {
            p256dh: 'A fake public key',
            auth: 'A fake auth token'
          },
        },
      }
    };
    const subscription = message.subscription.subscription;

    mq.send(JSON.stringify(message));

    yield waitUntilReminderHasStatus(family, id, 'done');

    sinon.assert.calledWith(webpush.sendNotification,
      subscription.endpoint,
      {
        userPublicKey: subscription.keys.p256dh,
        userAuth: subscription.keys.auth,
        payload: JSON.stringify(message.reminder),
      }
    );
  });
});
