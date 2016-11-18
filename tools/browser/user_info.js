const blessed = require('blessed');
const usersDao = Object.assign(
  {},
  require('../../dao/users'),
  require('./dao/users')
);

const GroupTable = require('./group_table');
const ReminderTable = require('./reminder_table');
const InfoBox = require('./info_box');
const Details = require('./details');

const remindersDao = require('../../dao/reminders');

const priv = {
  current: Symbol('current'),
  titles: Symbol('titles'),
  tables: Symbol('tables'),
  info: Symbol('info'),
};

class UserInfo extends InfoBox {
  constructor(options) {
    super(options);

    const titles = this[priv.titles] = {};
    const tables = this[priv.tables] = {};

    if (options.withDetails) {
      const info = this[priv.info] = new Details({
        top: 2,
      });

      this.append(info);
    }

    const groupTitle = titles.groups = blessed.text({
      content: 'groups',
      width: '30%',
      left: 0,
    });
    this.append(groupTitle);

    const groups = tables.groups = new GroupTable({
      left: 0,
      width: '30%',
    });
    this.append(groups);

    const reminderTitle = titles.reminders = blessed.text({
      content: 'reminders',
      width: '65%',
      right: 0,
    });
    this.append(reminderTitle);

    const reminders = tables.reminders = new ReminderTable({
      right: 0,
      width: '65%',
    });
    this.append(reminders);

    this.on('element key left', () => groups.focus());
    this.on('element key right', () => reminders.focus());
  }

  focus() {
    this[priv.tables].groups.focus();
  }

  refresh(id) {
    this[priv.current] = id = id || this[priv.current];

    return Promise.all([
      usersDao.getById(id),
      usersDao.getGroupsForUser(id),
      remindersDao.getAllForUserByStart(id, 0, 0), // all reminders, no limit
    ])
      .then(([ user, groups, reminders ]) => {
        this.setLabel(`User information for "${user.forename}"`);

        let delta = 0;
        if (this[priv.info]) {
          delta = this[priv.info].display(user) + 1;
        }

        for (const key in this[priv.titles]) {
          this[priv.titles][key].top = 2 + delta;
        }
        for (const key in this[priv.tables]) {
          const table = this[priv.tables][key];
          table.top = 4 + delta;
          table.height = `100%-${table.top}`;
        }

        const groupsTable = this[priv.tables].groups;
        if (groups.length) {
          groupsTable.show();

          const groupsHeaders = Object.keys(groups[0]);
          groups = groups.map(
            group => groupsHeaders.map(header => `${group[header]}`)
          );

          groupsTable.setRows([groupsHeaders, ...groups]);
        } else {
          groupsTable.hide();
        }

        const remindersTable = this[priv.tables].reminders;
        if (reminders.length) {
          remindersTable.show();

          const remindersHeaders = Object.keys(reminders[0]);
          reminders = reminders.map(
            reminder => remindersHeaders.map(header => `${reminder[header]}`)
          );

          remindersTable.setRows([remindersHeaders, ...reminders]);
        } else {
          remindersTable.hide();
        }

        // TODO understand why this doesn't work properly without this
        this.screen.debug(1);
      })
      .catch(console.error);
  }
}

module.exports = UserInfo;
