process.env.DEBUG_FD = 1; // debug() echoes to stdout instead of stderr

const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');

const jwt = require('express-jwt');

const login = require('./dao/login');
const config = require('./config');
const database = require('./dao/database');
const notificationsSender = require('./business/notifications');

database.init(config.profile);
notificationsSender.start();

const app = express();

const API_ROOT = '/api/v1';

app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.options('*', cors()); // include before other routes

// first check if the requested resource is the login.
app.post(`${API_ROOT}/login`, login);

// redirect if we're not logged in
app.use(jwt({ secret: 'some secret that you should configure' }));

app.use(`${API_ROOT}/reminders`, require('./routes/reminders'));
app.use(`${API_ROOT}/subscriptions`, require('./routes/subscriptions'));

app.get('/', (req, res) => {
  res.send('You may want to use the API instead.');
});

app.use((err, req, res, _next) => {
  switch(err.name) {
    case 'NotFoundError': break;
    default: console.error(err.stack);
  }

  const errorMessage = {
    error: err.name,
    code: err.code,
    message: err.message,
  };

  if (err.data) {
    errorMessage.data = err.data;
  }

  res.status(err.status || 500).send(errorMessage);
});

const server = app.listen(config.httpPort, () => {
  console.log(`HTTP server listening on port ${config.httpPort}.`);
});


process.on('SIGINT', () => {
  console.log('Received SIGINT. Closing app...');

  new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  }).then(() => notificationsSender.stop())
    .then(() => database.close())
    .then(() => process.exit())
    .catch((err) => {
      console.error('Error while closing app: ', err);
      process.exit(1);
    });
});
