const chakram = require('chakram');
const expect = chakram.expect;

const { testData } = require('../dao/schema');
const db = require('../dao/database');
const users = require('../dao/users');
const serverManager = require('./server_manager');

describe('dao:users', () => {
  beforeEach(() => {
    // Reset the database state between each test run
    serverManager.reinitProfile();
    return db.init(serverManager.profilePath, 'test.db').then(() => {
      return db.ready.then((db) => {
        return db.exec(testData);
      });
    });
  });

  describe('create(newUserObject)', () => {
    it('should create a new user', () => {
      const TEST_EMAIL = 'test@example.com';
      const TEST_PASSWORD = '/0!/~passw0rd';
      return users.create({
        emailAddress: TEST_EMAIL,
        password: TEST_PASSWORD,
        forename: 'Person'
      })
      .then(() => {
        return users.authenticateUser({
          emailAddress: TEST_EMAIL,
          password: TEST_PASSWORD
        })
        .then((authenticated) => {
          expect(authenticated).to.equal(true);
        });
      });
    });
  });

  describe('getUserByNameInGroup(name, groupId)', () => {
    it('should get the user by name in a group', () => {
      return users.getUserByNameInGroup('Ana', 1)
        .then((user) => {
          expect(user).to.deep.equal({
            forename: 'Ana',
            email: 'email@email.com',
            userId: 1
          });
        });
    });
  });

  describe('getUserFromUserId(userId)', () => {
    it('should get a user from their user id', () => {
      return users.getUserFromUserId(1)
        .then((user) => {
          expect(user).to.deep.equal({
            forename: 'Ana',
            email: 'email@email.com',
            userId: 1,
            groups: [
              { groupId: 1, name: 'Smith' },
              { groupId: 2, name: 'B' }
            ]
          });
        });
    });
  });

  describe('getUserFromEmail(email)', () => {
    it('should get a user from their email address', () => {
      return users.getUserFromEmail('email@email.com')
        .then((user) => {
          expect(user).to.deep.equal({
            forename: 'Ana',
            userId: 1,
            email: 'email@email.com',
            groups: [
              { groupId: 1, name: 'Smith' },
              { groupId: 2, name: 'B' }
            ]
          });
        });
    });
  });
});

