const blessed = require('blessed');
const { debounce } = require('lodash');

const DataTable = require('./data_table');
const { idFromContent } = require('./utils');

const priv = {
  table: Symbol('table'),
  noDataText: Symbol('noDataText'),
  dataInfo: Symbol('dataInfo'),
};

const knownTypes = [
  'user',
  'group',
  'reminder',
];

function DataPanel(dataType) {
  if (!knownTypes.includes(dataType)) {
    throw new Error(`The data type "${dataType}" is unknown.`);
  }

  const dao = Object.assign(
    {},
    require(`../../dao/${dataType}s`),
    require(`./dao/${dataType}s`)
  );
  const DataInfo = require(`./${dataType}_info`);

  return class extends blessed.Box {
    constructor() {
      super({
        grabKeys: true,
        width: '100%',
        height: '100%',
      });

      const table = this[priv.table] = new (DataTable(dataType))({
        width: '100%',
        height: '50%',
      });

      this.append(table);
      table.on('select item', debounce((item, _idx) => {
        if (!this.visible || !item.content) {
          return;
        }

        const id = idFromContent(item.content);
        if (!id) {
          return;
        }

        this.displayInfoFor(id);
      }, 100));

      const noDataText = this[priv.noDataText] = blessed.Text({
        content: `No ${dataType} found`
      });
      this.append(noDataText);

      const dataInfo = this[priv.dataInfo] = new DataInfo({
        bottom: 0,
        width: '100%',
        height: '50%',
      });
      this.append(dataInfo);

      this.on('element key tab', (el) => {
        if (el === table) {
          dataInfo.focus();
        } else {
          table.focus();
        }
        return false;
      });

      this.refresh();
    }

    refresh() {
      return dao.getAll()
        .then(datas => {
          if (datas.length) {
            this[priv.table].show();
            this[priv.noDataText].hide();
            const headers = Object.keys(datas[0]);
            const items = datas.map(
              data => headers.map(header => `${data[header]}`) // force strings
            );
            this[priv.table].setRows([headers, ...items]);
          } else {
            this[priv.table].hide();
            this[priv.noDataText].show();
          }
        })
        .catch(console.error);
    }

    focus() {
      this[priv.table].focus();
    }

    displayInfoFor(id) {
      if (!this.visible) {
        return;
      }

      this[priv.dataInfo].refresh(id)
        .then(() => this[priv.dataInfo].render());
    }
  };
}

module.exports = DataPanel;
