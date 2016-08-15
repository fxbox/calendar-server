const chakram = require('chakram');
const expect = chakram.expect;

const { testData } = require('../dao/schema');
const db = require('../dao/database');
const reminders = require('../dao/reminders');
const serverManager = require('./server_manager');

describe('dao', () => {
  beforeEach(() => {
    // Reset the database state between each test run
    serverManager.reinitProfile();
    return db.init(serverManager.profilePath, 'test.db').then(() => {
      return db.ready.then((db) => {
        return db.exec(testData);
      });
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

    describe('indexByStatus(groupId, status, limit)', () => {

      it('should return reminders by status', () => {
        const result = reminders.indexByStatus(1, 'waiting', 2);

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

    describe('create(groupId, reminder)', () => {
      it('should create a new reminder in the database and' +
        ' associate with users', () => {
        return reminders.create(1, {
          recipients: [ { userId: 1 }, { userId: 2 }],
          action: 'pick up from school',
          due: 1470839865000
        })
        .then((result) => {
          expect(result.length).to.equal(2);
        });
      });
    });

    describe('show(groupId, id)', () => {
      it('should show a reminder with a specific ID', () => {
        return reminders.show(1, 1)
          .then((reminder) => {
            expect(reminder.recipients).deep.equal([
              { userId: 1, forename: 'Ana' },
              { userId: 2, forename: 'Bob' }
            ]);
            expect(reminder.action).to.equal('attend important meeting');
          });
      });
    });

    describe('delete(groupId, id)', () => {
      it('should delete a reminder with a specific ID', () => {
        return reminders.delete(1, 1)
          .then(() => {
            return reminders.show(1, 1);
          })
          .then(() => {
            throw new Error('Expected reminder to be deleted');
          })
          .catch((error) => {
            expect(error.message).to.equal('The reminder with id `1` ' +
              'does not exist.');
          });
      });
    });

    describe('update(groupId, id, updatedReminder', () => {
      it('should update a reminder, removing recipients and ' +
        'adding recipients if necessary', () => {
        return reminders.update(1, 1, {
          action: 'dinner with friends',
          due: 100,
          recipients: [ { userId: 1 }, { userId: 3 } ]
        }).then(() => {
          return reminders.show(1, 1).then((reminder) => {
            expect(reminder.recipients).deep.equal([
              { userId: 1, forename: 'Ana' },
              { userId: 3, forename: 'Sam' }
            ]);
            expect(reminder.action).to.equal('dinner with friends');
          });
        });
      });
    });

    describe('findAllDueReminders(now)', () => {
      it('should find all reminders due by time "now"', () => {
        reminders.findAllDueReminders(9999999999000)
          .then(() => {
            // TODO: Format response
            expect(false).to.equal(true);
          });
      });
    });
  });
});
