const debug = require('debug')('calendar-server:routes/reminders');
const express = require('express');

const reminders = require('../dao/reminders');

const router = express.Router();

function removeFamilyProperty(item) {
  delete item.family;
  return item;
}

router.get('/', (req, res, next) => {
  const start = parseInt(req.query.start);
  let limit = parseInt(req.query.limit);
  const family = req.user.family;

  if (Number.isNaN(limit)) {
    limit = 20;
  }

  let operationPromise;
  if (Number.isNaN(start)) {
    operationPromise = reminders.indexByStatus(family, 'waiting', limit);
  } else {
    operationPromise = reminders.indexByStart(family, start, limit);
  }

  operationPromise.then(rows => {
    // We don't want to expose the family in the API result
    res.send(rows.map(removeFamilyProperty));
  }).catch(next);
});

router.post('/', (req, res, next) => {
  reminders.create(req.user.family, req.body).then((id) => {
    debug('Reminder #%s has been created in database', id);
    res.status(201).location(`${req.baseUrl}/${id}`).end();
  }).catch(next);
});

router.route('/:id')
  .get((req, res, next) => {
    reminders.show(req.user.family, req.params.id).then((reminder) => {
      debug('Found reminder `%o`', reminder);
      res.send(removeFamilyProperty(reminder));
    }).catch(next);
  })
  .delete((req, res, next) => {
    reminders.delete(req.user.family, req.params.id)
      .then(() => res.status(204).end())
      .catch(next);
  })
  .put((req, res, next) => {
    reminders.update(req.user.family, req.params.id, req.body)
      .then(() => res.status(204).end())
      .catch(next);
  });

module.exports = router;
