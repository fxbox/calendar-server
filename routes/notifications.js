const debug = require('debug')('calendar-server:routes/notifications');

const express = require('express');
const notifications = require('../dao/notifications');

const router = express.Router();

function unflattenNotificationAndHidePrivateData(item) {
  return {
    id: item.id,
    identifier: item.identifier,
    subscription: {
      endpoint: item.endpoint,
      keys: {
        p256dh: item.p256dh
      }
    }
  };
}

router.post('/', function(req, res, next) {
  notifications.create(req.user.family, req.body).then((id) => {
    res.status(201).location(`${req.baseUrl}/${id}`).end();
  }).catch(next);
});

router.get('/', function(req, res, next) {
  notifications.index(req.user.family).then((rows) => {
    res.send(rows.map(unflattenNotificationAndHidePrivateData));
  }).catch(next);
});

router.get('/:id', (req, res, next) => {
  notifications.show(req.user.family, req.params.id)
    .then((notification) => {
      debug('found notification %o', notification);
      res.send(unflattenNotificationAndHidePrivateData(notification));
    }).catch(next);
});

router.delete('/:id', (req, res, next) => {
  notifications.delete(req.user.family, req.params.id)
    .then(() => res.status(204).end())
    .catch(next);
});

router.put('/:id', (req, res, next) => {
  notifications.update(req.user.family, req.params.id, req.body)
    .then(() => res.status(204).end())
    .catch(next);
});

module.exports = router;
