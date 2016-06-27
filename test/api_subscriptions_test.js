const chakram = require('chakram');
const expect = chakram.expect;

const serverManager = require('./server_manager');
const config = require('./config.js');

describe('/subscriptions', function() {
  const subscriptionsUrl = `${config.apiRoot}/subscriptions`;

  const initialSubscription = {
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
    title: initialSubscription.title,
    subscription: {
      endpoint: initialSubscription.subscription.endpoint,
      keys: {
        p256dh: initialSubscription.subscription.keys.p256dh,
      }
    }
  };

  beforeEach(function() {
    return serverManager.start()
      .then(() => chakram.post(
        `${config.apiRoot}/login`,
        { user: 'family_name', password: 'password' }
      )).then(res => {
        chakram.setRequestDefaults({
          headers: {
            Authorization: `Bearer ${res.body.token}`
          }
        });
      });
  });

  afterEach(function() {
    chakram.clearRequestDefaults();
    return serverManager.stop();
  });

  it('should add a new subscription endpoint and make it visible', function() {
    return chakram.post(subscriptionsUrl, initialSubscription).then(res => {
      expect(res).status(201);
      expect(res).header('location', '/api/v1/subscriptions/1');

      return chakram.get(subscriptionsUrl);
    }).then(res => {
      expect(res.body).deep.equal([expectedSubscription]);
    });
  });
});
