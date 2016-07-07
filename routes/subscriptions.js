const debug = require('debug')('calendar-server:routes/subscriptions');

const express = require('express');
const subscriptions = require('../dao/subscriptions');

const router = express.Router();

function hidePrivateData(item) {
  delete item.family;
  delete item.subscription.keys.auth;
  return item;
}

router.post('/', function(req, res, next) {
  subscriptions.create(req.user.family, req.body)
    .then((subscription) => {
      debug('created subscription %o', subscription);
      res.status(201).location(`${req.baseUrl}/${subscription.id}`)
        .send(hidePrivateData(subscription));
    }).catch(next);
});

router.get('/', function(req, res, next) {
  subscriptions.index(req.user.family).then((rows) => {
    res.send(rows.map(hidePrivateData));
  }).catch(next);
});

router.route('/:id')
  .get((req, res, next) => {
    subscriptions.show(req.user.family, req.params.id)
      .then((subscription) => {
        debug('found subscription %o', subscription);
        res.send(hidePrivateData(subscription));
      }).catch(next);
  })
  .delete((req, res, next) => {
    subscriptions.delete(req.user.family, req.params.id)
    .then(() => res.status(204).end())
    .catch(next);
  })
  .put((req, res, next) => {
    subscriptions.update(req.user.family, req.params.id, req.body)
    .then((subscription) => {
      debug('updated subscription %o', subscription);
      res.send(hidePrivateData(subscription));
    }).catch(next);
  });

module.exports = router;
