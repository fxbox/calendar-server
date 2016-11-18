const blessed = require('blessed');

const UserTable = require('./user_table');
const InfoBox = require('./info_box');
const Details = require('./details');

const remindersDao = require('../../dao/reminders');

const priv = {
  current: Symbol('current'),
  userTitle: Symbol('userTitle'),
  userTable: Symbol('userTable'),
  info: Symbol('info'),
};

class ReminderInfo extends InfoBox {
  constructor(options) {
    super(options);

    if (options.withDetails) {
      const info = this[priv.info] = new Details({
        top: 2,
      });

      this.append(info);
    }

    const userTitle = this[priv.userTitle] = blessed.text({
      content: 'recipients',
      width: 'half',
      left: 0,
    });
    this.append(userTitle);

    const users = this[priv.userTable] = new UserTable({
      left: 0,
      width: '100%',
      height: '100%-4',
    });

    this.append(users);
  }

  focus() {
    this[priv.userTable].focus();
  }

  refresh(id) {
    this[priv.current] = id = id || this[priv.current];

    return Promise.all([
      remindersDao.show(id),
      remindersDao.getRecipients(id),
    ])
      .then(([ reminder, users ]) => {
        this.setLabel(`Information for reminder "${reminder.id}"`);

        let delta = 0;
        if (this[priv.info]) {
          delete reminder.recipients;
          delta = this[priv.info].display(reminder) + 1;
        }

        const userTable = this[priv.userTable];

        this[priv.userTitle].top = 2 + delta;
        userTable.top = 4 + delta;
        userTable.height = `100%-${userTable.top}`;

        if (users.length) {
          userTable.show();

          const usersHeaders = Object.keys(users[0]);
          users = users.map(
            user => usersHeaders.map(header => `${user[header]}`)
          );

          userTable.setRows([usersHeaders, ...users]);
        } else {
          userTable.hide();
        }

        // TODO understand why this doesn't work properly without this
        this.screen.debug(1);
      })
      .catch(console.error);
  }
}

module.exports = ReminderInfo;
