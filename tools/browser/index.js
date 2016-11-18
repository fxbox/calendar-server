const blessed = require('blessed');

const config = require('../../config');
const database = require('../../dao/database');

database.init(config.profile);

const modules = [
  'users',
  'groups',
  'reminders',
];

const ui = {
  users: require('./user_panel'),
  groups: require('./group_panel'),
  reminders: require('./reminder_panel'),
};

const screen = blessed.screen({
  smartCSR: true,
  autoPadding: true,
  log: 'browser.log',
  debug: true
});

screen.title = 'Abigail browser';

const objectList = blessed.list({
  items: modules.slice(), // Blessed has a bug and changes the parameter
  style: {
    selected: { inverse: true },
  },
  keys: true,
});

const UIStack = [];

screen.on('adopt', el => {
  UIStack.push(el);
});

objectList.on('select', function({ content }) {
  const view = new ui[content];
  screen.append(view);
  view.refresh()
    .then(() => {
      view.focus();
      screen.render();
    });
});

screen.append(objectList);
objectList.focus();

// Quit on q, or Control-C.
screen.key(['q', 'C-c'], function(ch, _key) {
  return process.exit(0);
});

screen.key('escape', function() {
  const last = UIStack.pop();
  if (!UIStack.length) {
    process.exit(0);
  }
  screen.remove(last);
  UIStack[UIStack.length - 1].focus();
  screen.render();
});

screen.render();
