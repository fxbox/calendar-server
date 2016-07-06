const chakram = require('chakram');
const expect = chakram.expect;
const mq = require('zmq').socket('pull');

const serverManager = require('./server_manager');
const config = require('./config.js');

function waitForMqMessage() {
  return new Promise(resolve => {
    mq.once('message', (message) => {
      message = JSON.parse(message.toString());
      // Undeterministic timestamp. Asserting against it doesn't
      // provide any value to the test
      delete message.reminder.created;
      resolve(message);
    });
  });
}

describe('notifications', function() {
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
    subscription: {
      endpoint: subscription.subscription.endpoint,
      keys: {
        p256dh: subscription.subscription.keys.p256dh,
        auth: subscription.subscription.keys.auth
      },
    },
  };


  const inputs = [{
    recipient: 'Jane',
    action: 'Pick up kids at school',
    due: Date.now(),
  }, {
    recipient: 'John',
    action: 'Buy milk',
    due: Date.now(),
  }, {
    recipient: 'David',
    action: 'Go to school',
    due: Date.now(),
  }];

  const outputs = inputs.map((input, i) => {
    const reminder = Object.assign(
      {
        id: i + 1,
        family: 'family_name',
        // FIXME: The status value shouldn't be sent to the message queue, as it
        // gives an outdated information
        status: 'waiting'
      },
      input
    );
    return {
      reminder,
      subscription: expectedSubscription
    };
  });

  const remindersUrl = `${config.apiRoot}/reminders`;
  const subscriptionsUrl = `${config.apiRoot}/subscriptions`;

  const mqSocket = `tcp://127.0.0.1:${serverManager.mqPort}`;

  serverManager.inject();

  beforeEach(function*() {
    mq.connect(mqSocket);
    yield chakram.post(subscriptionsUrl, subscription);
  });

  afterEach(function() {
    mq.disconnect(mqSocket);
  });

  it('should not send a reminder twice to the message queue', function*() {
    this.timeout(10000); // Test is longer than the regular 2s-allowed-span.

    // We try to determine if the first reminder has been sent only once.
    // In order to do so, we verify that this reminder is not sent a second time
    // in the second setInterval. As our SQL queries are not ordered, it might
    // occur that the first reminder pops up after the second one (in the second
    // interval). Hence, the 3rd reminder is a sentinel to make sure we entered
    // a new interval.
    for (let i = 0; i < inputs.length; i++) {
      yield chakram.post(remindersUrl, inputs[i]);

      const message = yield waitForMqMessage();
      expect(message).deep.equal(outputs[i]);
    }
  });
});
