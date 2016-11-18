const blessed = require('blessed');
const { throttle } = require('lodash');

class StyledTable extends blessed.ListTable {
  constructor(position) {
    super({
      style: {
        cell: { selected: { inverse: true }},
        header: { bold: true },
        focus: {
          border: { fg: 'red' },
        },
      },
      border: { type: 'line' },
      noCellBorders: true,
      hidden: true,
      position,
      interactive: true,
      keys: true,
    });

    let offset = 0;
    const throttledMove = throttle(() => {
      this.move(offset);
      offset = 0;
    }, 100);

    this.key('pageup, pagedown, S-pageup, S-pagedown', (ch, key) => {
      let newOffset = key.name === 'pageup' ? -5 : 5;
      if (key.shift) {
        newOffset *= 2;
      }
      offset += newOffset;
      throttledMove();
    });
  }
}

module.exports = StyledTable;
