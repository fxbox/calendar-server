const debug = require('debug')('calendar-server:routes/reminders');
const express = require('express');

const reminders = require('../dao/reminders');
const { Status } = require('../model/reminder');

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
    operationPromise = reminders.indexByStatus(family, Status.WAITING, limit);
  } else {
    operationPromise = reminders.indexByStart(family, start, limit);
  }

  operationPromise.then(rows => {
    // We don't want to expose the family in the API result
    res.send(rows.map(removeFamilyProperty));
  }).catch(next);
});

router.post('/', (req, res, next) => {
  const family = req.user.family;
  reminders.create(family, req.body).then((id) => {
    debug('Reminder #%s has been created in database', id);

    return reminders.show(family, id);
  }).then((reminder) => {
    debug('Reminder #%s is: %o', reminder.id, reminder);
    res
      .status(201)
      .location(`${req.baseUrl}/${reminder.id}`)
      .send(removeFamilyProperty(reminder));
  }).catch(next);
});

router.route('/:id')
  .get((req, res, next) => {
    reminders.show(req.user.family, req.params.id).then((reminder) => {
      debug('Found reminder %o', reminder);
      res.send(removeFamilyProperty(reminder));
    }).catch(next);
  })
  .delete((req, res, next) => {
    reminders.delete(req.user.family, req.params.id)
      .then(() => res.status(204).end())
      .catch(next);
  })
  .put((req, res, next) => {
    const family = req.user.family;
    const id = req.params.id;

    reminders.update(family, id, req.body).then(() => {
      debug('Reminder #%s has been updated in database', id);

      return reminders.show(family, id);
    }).then((reminder) => {
      debug('Reminder #%s has been updated: %o', id, reminder);
      res.send(removeFamilyProperty(reminder));
    }).catch(next);
  });

module.exports = router;
