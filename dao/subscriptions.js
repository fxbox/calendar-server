const debug = require('debug')('calendar-server:subscriptions');

const database = require('./database');
const { checkPropertyType } = require('../utils/object_validator.js');

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
    debug('index family=%s', family);
    return database.ready
      .then(
        db => db.all('SELECT * FROM subscriptions WHERE family = ?', family)
      ).then(items => items.map(unflatten));
  },

  create(family, subscription) {
    debug('create subscription %o for family %s', subscription, family);
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
      ));
  },

  show(family, subscriptionId) {
    debug('show subscription #%s for family %s', subscriptionId, family);

    return database.ready
      .then(db => db.get(
        'SELECT * FROM subscriptions WHERE family = ? AND id = ?',
        family, subscriptionId
      )).then(unflatten);
  },

  delete(family, subscriptionId) {
    debug('delete subscription #%s for family %s', subscriptionId, family);
    return database.ready
      .then(db => db.run(
        'DELETE FROM subscriptions WHERE family = ? AND id = ?',
        family, subscriptionId
      ));
  },

  update(family, subscriptionId, updatedSubscription) {
    debug('update subscription #%s for family %s', subscriptionId, family);
    return database.ready
      .then(db => db.run(
        `UPDATE subscriptions SET
        title = ?
        WHERE family = ? AND id = ?`,
        updatedSubscription.title,
        family, subscriptionId
      ));
  },
};
