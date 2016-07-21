const debug = require('debug')('calendar-server:subscriptions');

const database = require('./database');
const { generateNotFoundError } = require('../utils/errors');
const { checkPropertyType } = require('../utils/object_validator.js');

function notFoundError(id) {
  return generateNotFoundError('subscription', { name: 'id', value: id });
}

function endpointNotFoundError(endpoint) {
  return generateNotFoundError(
    'subscription', { name: 'endpoint', value: endpoint }
  );
}

function unflatten(item) {
  return {
    id: item.id,
    family: item.family,
    title: item.title,
    subscription: {
      endpoint: item.endpoint,
      keys: {
        p256dh: item.p256dh,
        auth: item.auth
      }
    }
  };
}

module.exports = {
  index(family) {
    debug('index(family=%s)', family);
    return database.ready
      .then(
        db => db.all('SELECT * FROM subscriptions WHERE family = ?', family)
      ).then(items => items.map(unflatten));
  },

  create(family, subscription) {
    debug('create(family=%s, subscription=%o)', family, subscription);
    checkPropertyType(subscription, 'subscription', 'object');
    checkPropertyType(subscription.subscription, 'keys', 'object');

    return database.ready
      .then(db => db.run(
        `INSERT INTO subscriptions
          (family, title, endpoint, p256dh, auth)
          VALUES (?, ?, ?, ?, ?)`,
          family,
          subscription.title,
          subscription.subscription.endpoint,
          subscription.subscription.keys.p256dh,
          subscription.subscription.keys.auth // TODO Encrypt this value
      ))
      .then(result => result.lastId);
  },

  show(family, id) {
    debug('show(family=%s, id=%s)', family, id);

    return database.ready
      .then(db => db.get(
        'SELECT * FROM subscriptions WHERE family = ? AND id = ?',
        family, id
      ))
      .then(row => row || Promise.reject(notFoundError(id)))
      .then(unflatten);
  },

  findByEndpoint(family, endpoint) {
    debug('findByEndpoint(family=%s, endpoint=%s)', family, endpoint);
    return database.ready
      .then(db => db.get(
        'SELECT * FROM subscriptions WHERE family = ? AND endpoint = ?',
        family, endpoint
      ))
      .then(row => row || Promise.reject(endpointNotFoundError(endpoint)))
      .then(unflatten);
  },

  delete(family, id) {
    debug('delete(family=%s, id=%s)', family, id);
    return database.ready
      .then(db => db.delete(
        'FROM subscriptions WHERE family = ? AND id = ?',
        family, id
      ));
  },

  update(family, id, updatedSubscription) {
    debug('update(family=%s, id=%s)', family, id);
    return database.ready
      .then(db => db.update(
        `subscriptions SET
        title = ?
        WHERE family = ? AND id = ?`,
        updatedSubscription.title,
        family, id
      ));
  },

  findSubscriptionsByFamily(family) {
    debug('findSubscriptionsByFamily(family=%s)', family);
    return database.ready.then(
      db => db.all('SELECT * FROM subscriptions WHERE family = ?', family)
    ).then(items => items.map(unflatten));
  }
};
