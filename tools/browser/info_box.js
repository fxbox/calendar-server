const blessed = require('blessed');

module.exports = class extends blessed.Box {
  constructor(options = {}) {
    options.style = Object.assign(options.style || {}, {
      label: { bold: true }
    });
    super(options);

    // TODO: abstract away the focus management with arrow keys
  }
};
