const StyledTable = require('./styled_table');
const { idFromContent } = require('./utils');

const knownTypes = [
  'user',
  'group',
  'reminder',
];

function DataTable(dataType) {
  if (!knownTypes.includes(dataType)) {
    throw new Error(`The data type "${dataType}" is unknown.`);
  }

  return class extends StyledTable {
    constructor(options) {
      super(options);


      this.on('select', (item, _idx) => {
        if (!this.visible || !item.content) {
          return;
        }

        const id = idFromContent(item.content);
        if (!id) {
          return;
        }

        // require here to avoid circular dependency at init
        const MoreInfo = require(`./${dataType}_info`);
        const moreInfo = new MoreInfo({
          width: '100%',
          height: '100%',
          withDetails: true,
        });
        this.screen.append(moreInfo);
        moreInfo.focus();
        moreInfo.refresh(id)
          .then(() => this.screen.render());
      });
    }
  };
}


module.exports = DataTable;
