/* eslint-disable no-unused-expressions */
const chakram = require('chakram');
const expect = chakram.expect;

const serverManager = require('./server_manager');
const config = require('./config.js');

function assertFullRemindersAreEqual(actual, expected,
  timestampBeforeCreation, timestampAfterCreation) {
  expect(actual.created).within(
    timestampBeforeCreation, timestampAfterCreation
  );

  // Removed so we don't assert equality on this unknown value
  delete actual.created;
  expect(actual).deep.equal(expected);
}

describe('/reminders', function() {
  const remindersUrl = `${config.apiRoot}/reminders`;

  const initialReminder = {
    recipient: 'Jane',
    message: 'Pick up kids at school',
    due: Date.now() + 2 * 60 * 60 * 1000,
  };

  serverManager.inject();

  it('should implement basic CRUD functionality', function*() {
    const expectedLocation = `${remindersUrl}/1`;
    const expectedReminder = Object.assign(
      { id: 1, status: 'waiting' },
      initialReminder
    );
    const updatedReminder = {
      recipient: 'John',
      message: 'Go shopping',
      due: Date.now() + 4 * 60 * 60 * 1000,
    };
    const expectedUpdatedReminder = Object.assign(
      {}, expectedReminder, updatedReminder
    );


    const timestampBeforeCreation = Date.now();

    let res = yield chakram.post(remindersUrl, initialReminder);
    const timestampAfterCreation = Date.now();
    expect(res).status(201);
    expect(res).header('location', '/api/v1/reminders/1');
    assertFullRemindersAreEqual(res.body, expectedReminder,
      timestampBeforeCreation, timestampAfterCreation);

    res = yield chakram.get(expectedLocation);
    expect(res).status(200);
    assertFullRemindersAreEqual(res.body, expectedReminder,
      timestampBeforeCreation, timestampAfterCreation);

    res = yield chakram.put(expectedLocation, updatedReminder);
    expect(res).status(204);

    res = yield chakram.get(expectedLocation);
    expect(res).status(200);
    assertFullRemindersAreEqual(res.body, expectedUpdatedReminder,
      timestampBeforeCreation, timestampAfterCreation);

    res = yield chakram.delete(expectedLocation);
    expect(res).status(204);

    res = yield chakram.get(remindersUrl);
    expect(res.body).deep.equal([]);
  });

  it('404 errors', function*() {
    const location = `${remindersUrl}/99999`;
    let res = yield chakram.get(location);
    expect(res).status(404);

    res = yield chakram.put(location, {});
    expect(res).status(404);

    res = yield chakram.delete(location);
    expect(res).status(404);
  });

  it('GET /reminders', function*() {
    let res = yield chakram.get(remindersUrl);
    expect(res).status(200);
    expect(res.body).deep.equal([]);

    yield chakram.post(remindersUrl, initialReminder);
    res = yield chakram.get(remindersUrl);
    expect(res.body).lengthOf(1);

    yield chakram.post(remindersUrl, initialReminder);
    res = yield chakram.get(remindersUrl);
    expect(res.body).lengthOf(2);

    // now testing the limit parameter
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(chakram.post(remindersUrl, initialReminder));
    }
    yield Promise.all(promises);

    res = yield chakram.get(remindersUrl);
    expect(res.body).lengthOf(20);

    res = yield chakram.get(`${remindersUrl}?limit=25`);
    expect(res.body).lengthOf(22);

    res = yield chakram.get(`${remindersUrl}?limit=0`);
    expect(res.body).lengthOf(22);
    expect(res.body.every((reminder, i) => reminder.id === i + 1)).true;
  });

  it('GET /reminders?start', function*() {
    const now = Date.now();
    const firstReminder = Object.assign(
      {}, initialReminder,
      { due: now }
    );
    const secondReminder = Object.assign(
      {}, initialReminder,
      { due: now + 10 * 60 * 1000 }
    );

    yield Promise.all([
      chakram.post(remindersUrl, firstReminder),
      chakram.post(remindersUrl, secondReminder)
    ]);

    let res = yield chakram.get(remindersUrl);
    expect(res).status(200);
    expect(res.body).lengthOf(2);

    res = yield chakram.get(`${remindersUrl}?start=${now}`);
    expect(res).status(200);
    expect(res.body).lengthOf(2);

    res = yield chakram.get(`${remindersUrl}?start=${now + 1}`);
    expect(res).status(200);
    expect(res.body).lengthOf(1);

    res = yield chakram.get(`${remindersUrl}?start=${now + 11 * 60 * 1000}`);
    expect(res).status(200);
    expect(res.body).deep.equal([]);

    // now testing the limit parameter
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(chakram.post(remindersUrl, initialReminder));
    }
    yield Promise.all(promises);

    res = yield chakram.get(`${remindersUrl}?start=0`);
    expect(res.body).lengthOf(20);

    res = yield chakram.get(`${remindersUrl}?start=0&limit=25`);
    expect(res.body).lengthOf(22);

    res = yield chakram.get(`${remindersUrl}?start=0&limit=0`);
    expect(res.body).lengthOf(22);
  });
});
