const path = require('path');
const config = require('minimist')(
  process.argv.slice(2),
  {
    default: {
      httpPort: 3000,
      mqPort: 4000,
      notificationPoll: 60, // in seconds
      profile: path.join(__dirname, 'profiles/development')
    }
  }
);

if (!path.isAbsolute(config.profile)) {
  config.profile = path.join(process.cwd(), config.profile);
}

require('mkdirp').sync(config.profile);

module.exports = config;
