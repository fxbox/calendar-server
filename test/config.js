const port = require('./server_manager').httpPort;

module.exports = {
  apiRoot: `http://localhost:${port}/api/v1`
};
