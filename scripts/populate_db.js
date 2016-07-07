#!/usr/bin/env node

const request = require('request-promise');


const baseUrl = process.env.TARGET_ENV === 'production'
  ? 'https://calendar.knilxof.org/api/v1'
  : 'http://localhost:3000/api/v1';

const baseOptions = {
  json: true,
  url: `${baseUrl}/reminders`
};

const familyName = process.env.FAMILY || 'mozilla';

function login() {
  console.log('Logging in with user `%s`', familyName);
  return request.post({
    url: `${baseUrl}/login`,
    json: true,
    body: { user: familyName, password: 'password' }
  }).then(res => {
    console.log('... authenticated with token `%s`', res.token);
    baseOptions.headers = {
      Authorization: `Bearer ${res.token}`
    };
  });
}

function insertReminders() {
  let reminders = require('./reminders.json');

  const now = Date.now();
  reminders = reminders.map((reminder, i) => {
    reminder.due = now + i * 5 * 60 * 1000;
    return reminder;
  });

  function postReminder(i) {
    const reminder = reminders[i];
    console.log('Inserting reminder %j', reminder);
    const options = Object.assign({}, baseOptions, { body: reminder });
    return request.post(options);
  }

  function postAndContinue(i) {
    const promise = postReminder(i);
    if (i === reminders.length - 1) {
      return promise;
    }

    return promise.then(() => postAndContinue(i + 1));
  }

  return postAndContinue(0);
}

login().then(insertReminders).then(() => {
  console.log('Insertion is finished.');
});
