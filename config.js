const path = require('path');
const config = require('minimist')(
  process.argv.slice(2),
  {
    default: {
      port: 3000,
      mqport: 4000,
      poll: 60,
      profile: path.join(__dirname, 'profiles/development')
    }
  }
);

if (!path.isAbsolute(config.profile)) {
  config.profile = path.join(process.cwd(), config.profile);
}

require('mkdirp').sync(config.profile);

module.exports = config;
