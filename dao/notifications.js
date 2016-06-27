const debug = require('debug')('calendar-server:notifications');

const database = require('./database');
const { checkPropertyType } = require('../utils/object_validator.js');

module.exports = {
  index(family) {
    debug('index family=%s', family);
    return database.ready
      .then(
        db => db.all('SELECT * FROM notifications WHERE family = ?', family)
      );
  },

  create(family, notification) {
    debug('create notification %o for family %s', notification, family);
    checkPropertyType(notification, 'subscription', 'object');
    checkPropertyType(notification.subscription, 'keys', 'object');

    return database.ready
      .then(db => db.run(
        `INSERT INTO notifications
          (family, identifier, endpoint, p256dh, auth)
          VALUES (?, ?, ?, ?, ?)`,
          family,
          notification.identifier,
          notification.subscription.endpoint,
          notification.subscription.keys.p256dh,
          notification.subscription.keys.auth // TODO Encrypt this value
      ));
  },

  show(family, notificationId) {
    debug('show notification #%s for family %s', notificationId, family);

    return database.ready
      .then(db => db.get(
        'SELECT * FROM notifications WHERE family = ? AND id = ?',
        family, notificationId
      ));
  },

  delete(family, notificationId) {
    debug('delete reminder #%s for family %s', notificationId, family);
    return database.ready
      .then(db => db.run(
        'DELETE FROM notifications WHERE family = ? AND id = ?',
        family, notificationId
      ));
  },
};
