const spawn = require('child_process').spawn;
const path = require('path');
const rimraf = require('rimraf');
const tcpPortUsed = require('tcp-port-used');
const mkdirp = require('mkdirp');

const entryPoint = path.join(__dirname, '../app.js');

let handler;

const httpPort = 3001;
const mqPort = 4001;
const profilePath = path.join(__dirname, '../profiles/test');

module.exports = {
  httpPort,
  mqPort,
  profilePath,
  reinitProfile() {
    rimraf.sync(profilePath);
    mkdirp.sync(profilePath);
  },
  start() {
    this.reinitProfile();

    handler = spawn(
      'node',
      [ entryPoint,
        '--httpPort', httpPort,
        '--profile', profilePath,
        '--mqPort', mqPort,
        '--notificationPoll', '1000',
      ],
      { stdio: 'inherit' }
    );

    const timeBetweenRetriesInMs = 500;
    const timeOutInMs = 5000;
    return tcpPortUsed.waitUntilUsed(
      httpPort, timeBetweenRetriesInMs, timeOutInMs
    );
  },

  stop() {
    return new Promise(resolve => {
      handler.on('exit', () => resolve());
      handler.kill();
    });
  },

  inject() {
    const chakram = require('chakram');
    const config = require('./config');

    const self = this;

    beforeEach(function*() {
      yield self.start();
      const res = yield chakram.post(
        `${config.apiRoot}/login`,
        { user: 'family_name', password: 'password' }
      );
      chakram.setRequestDefaults({
        headers: {
          Authorization: `Bearer ${res.body.token}`
        }
      });
    });

    afterEach(function*() {
      chakram.clearRequestDefaults();
      yield self.stop();
    });
  },
};
