const chakram = require('chakram');
const expect = chakram.expect;

const { testData } = require('../dao/schema');
const db = require('../dao/database');
const groups = require('../dao/groups');
const serverManager = require('./server_manager');

describe('dao:groups', () => {
  beforeEach(() => {
    // Reset the database state between each test run
    serverManager.reinitProfile();
    return db.init(serverManager.profilePath, 'test.db').then(() => {
      return db.ready.then((db) => {
        return db.exec(testData);
      });
    });
  });

  describe('create(group)', () => {
    it('should create a new group in the database', () => {

      // Create
      return groups.create({
        name: 'Smith'
      }).then((groupId) => {
        // Get
        return groups.getGroup(groupId)
          .then((group) => {
            expect(group.name).to.equal('Smith');
          })
          // Delete
          .then(() => {
            return groups.delete(groupId);
          })
          // Get
          .then(() => {
            return groups.getGroup(groupId);
          })
          .then(() => {
            throw new Error('Expected group to be deleted');
          })
          .catch((e) => {
            expect(e.message).to.equal(`The group with id \`${groupId}\` ` +
              'does not exist.');
          });
      });
    });
  });

  describe('getAllUsersInGroup(groupId)', () => {
    it('should list all users within a group', () => {
      return groups.getAllUsersInGroup(1)
        .then((users) => {
          expect(users).to.deep.equal([
            { userId: 1, forename: 'Ana' },
            { userId: 2, forename: 'Bob' },
            { userId: 3, forename: 'Sam' }
          ]);
        });
    });
  });

  describe('addUserToGroup(groupId, userId)', () => {
    it('should add a new user to an existing group', () => {
      return groups.create({
        name: 'A'
      })
      .then((groupId) => {
        return groups.addUserToGroup(groupId, 1)
          .then(() => {
            return groups.getAllUsersInGroup(groupId);
          });
      })
      .then((users) => {
        expect(users).to.deep.equal([
          { userId: 1, forename: 'Ana' }
        ]);
      });
    });
  });
});
