const chakram = require('chakram');
const expect = chakram.expect;

const { testData } = require('../dao/schema');
const db = require('../dao/database');
const reminders = require('../dao/reminders');
const serverManager = require('./server_manager');

describe('dao', () => {
  before(() => {
    serverManager.reinitProfile();
    return db.init(serverManager.profilePath, 'test.db');
  });

  beforeEach(() => {
    return db.ready.then((db) => {
      db.exec(testData);
    });
  });

  describe('reminders', () => {
    describe('indexByStart(groupId, start, limit)', () => {
      it('should return reminders by start value', () => {
        const result = reminders.indexByStart(1, 1470839863000, 2);

        return result.then((reminders) => {
          expect(reminders.length).to.equal(1);
          expect(reminders[0].recipients).deep.equal([
            { userId: 1, forename: 'Ana' },
            { userId: 2, forename: 'Bob' }
          ]);
          expect(reminders[0].action).to.equal('attend important meeting');
        });
      });
    });

  });
});
