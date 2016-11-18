const blessed = require('blessed');

module.exports = class Details extends blessed.Text {
  display(data) {
    const keys = Object.keys(data);
    this.content =
      keys.reduce((content, key) => `${content}${key}: ${data[key]}\n`, '');

    return keys.length;
  }
};
