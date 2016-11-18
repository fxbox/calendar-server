const chakram = require('chakram');
const expect = chakram.expect;

const { testData } = require('../dao/schema');
const db = require('../dao/database');
const groups = require('../dao/groups');
const config = require('./config');
const serverManager = require('./server_manager');

describe('dao/groups', () => {
  beforeEach(function*() {
    // Reset the database state between each test run
    serverManager.reinitProfile();
    yield db.init(config.profilePath);
    const dbInstance = yield db.ready;
    yield dbInstance.exec(testData);
  });

  describe('create(group)', function() {
    it('should create a new group in the database', function*() {

      const groupId = yield groups.create({
        name: 'Smith'
      });
      const group = yield groups.get(groupId);
      expect(group.name).to.equal('Smith');
      yield groups.delete(groupId);
      try {
        yield groups.get(groupId);
        throw new Error('Expected group to be deleted');
      } catch (e) {
        expect(e.message).to.equal(
          `The group with id \`${groupId}\` does not exist.`
        );
      }
    });
  });

  describe('getAllUsersInGroup(groupId)', function() {
    it('should list all users within a group', function*() {
      /* eslint-disable camelcase */
      const users = yield groups.getAllUsersInGroup(1);
      expect(users).to.deep.equal([
        {
          id: 1,
          forename: 'Ana',
          is_admin: 1,
          phone_number: null,
          username: 'email@email.com',
        },
        {
          id: 2,
          forename: 'Bob',
          is_admin: 0,
          phone_number: '2134567890',
          username: 'a@email.com',
        },
        {
          id: 3,
          forename: 'Sam',
          is_admin: 0,
          phone_number: '+12345678901',
          username: 'b@email.com',
        }
      ]);
      /* eslint-enable camelcase */
    });
  });

  describe('addUserToGroup(groupId, userId)', function() {
    it('should add a new user to an existing group', function*() {
      /* eslint-disable camelcase */
      const groupId = yield groups.create({
        name: 'A'
      });
      yield groups.addUserToGroup(groupId, 1);
      const users = yield groups.getAllUsersInGroup(groupId);
      expect(users).to.deep.equal([
        {
          id: 1,
          forename: 'Ana',
          is_admin: 0,
          phone_number: null,
          username: 'email@email.com',
        }
      ]);
      /* eslint-enable camelcase */
    });
  });
});
