const blessed = require('blessed');

const UserTable = require('./user_table');
const ReminderTable = require('./reminder_table');
const InfoBox = require('./info_box');

const groupsDao = require('../../dao/groups');
const remindersDao = require('../../dao/reminders');

const priv = {
  current: Symbol('current'),
  users: Symbol('users'),
  reminders: Symbol('reminders'),
};

class GroupInfo extends InfoBox {
  constructor(options) {
    super(options);

    const userTitle = blessed.text({
      content: 'users',
      width: 'half',
      top: 2,
      left: 0,
    });
    this.append(userTitle);

    const users = this[priv.users] = new UserTable({
      top: 4,
      left: 0,
      width: 'half',
      height: '100%-4',
    });

    this.append(users);

    const reminderTitle = blessed.text({
      content: 'reminders',
      width: 'half',
      top: 2,
      right: 0,
    });
    this.append(reminderTitle);

    const reminders = this[priv.reminders] = new ReminderTable({
      top: 4,
      right: 0,
      width: 'half',
      height: '100%-4',
    });
    this.append(reminders);

    this.on('element key left', () => users.focus());
    this.on('element key right', () => reminders.focus());
  }

  focus() {
    this[priv.users].focus();
  }

  refresh(id) {
    this[priv.current] = id = id || this[priv.current];

    return Promise.all([
      groupsDao.get(id),
      groupsDao.getAllUsersInGroup(id),
      remindersDao.getAllForGroupByStart(id, 0, 0), // all reminders, no limit
    ])
      .then(([ group, users, reminders ]) => {
        this.setLabel(`Information for group "${group.name}"`);

        if (users.length) {
          this[priv.users].show();

          const usersHeaders = Object.keys(users[0]);
          users = users.map(
            user => usersHeaders.map(header => `${user[header]}`)
          );

          this[priv.users].setRows([usersHeaders, ...users]);
        } else {
          this[priv.users].hide();
        }

        if (reminders.length) {
          this[priv.reminders].show();

          const remindersHeaders = Object.keys(reminders[0]);
          reminders = reminders.map(
            reminder => remindersHeaders.map(header => `${reminder[header]}`)
          );

          this[priv.reminders].setRows([remindersHeaders, ...reminders]);
        } else {
          this[priv.reminders].hide();
        }

        // TODO understand why this doesn't work properly without this
        this.screen.debug(1);
      })
      .catch(console.error);
  }
}

module.exports = GroupInfo;
