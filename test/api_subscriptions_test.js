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

  // In the test we'll try to change all fields, but only `title` should change.
  const updatedSubscription = {
    id: 1,
    title: 'my_updated_subscription',
    subscription: {
      endpoint: 'https://updated.endpoint',
      keys: {
        p256dh: 'updated_base_64',
        auth: 'updated_base_64'
      }
    }
  };

  const expectedUpdatedSubscription = Object.assign(
    {}, expectedSubscription,
    { title: updatedSubscription.title }
  );

  serverManager.inject();

  it('should implement basic CRUD functionality', function*() {
    const expectedLocation = `${subscriptionsUrl}/1`;

    let res = yield chakram.post(subscriptionsUrl, initialSubscription);
    expect(res).status(201);
    expect(res).header('location', '/api/v1/subscriptions/1');

    res = yield chakram.get(subscriptionsUrl);
    expect(res).status(200);
    expect(res.body).deep.equal([expectedSubscription]);

    res = yield chakram.put(expectedLocation, updatedSubscription);
    expect(res).status(204);

    res = yield chakram.get(expectedLocation);
    expect(res).status(200);
    expect(res.body).deep.equal(expectedUpdatedSubscription);

    res = yield chakram.delete(expectedLocation);
    expect(res).status(204);

    res = yield chakram.get(subscriptionsUrl);
    expect(res.body).deep.equal([]);
  });

  it('404 errors', function*() {
    const location = `${subscriptionsUrl}/99999`;
    let res = yield chakram.get(location);
    expect(res).status(404);

    res = yield chakram.put(location, {});
    expect(res).status(404);

    res = yield chakram.delete(location);
    expect(res).status(404);
  });
});
