const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');

const jwt = require('express-jwt');

const login = require('./dao/login');
const config = require('./config');

require('./dao/database').init(config.profile);


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
  console.error(err.stack);
  res.status(err.status || 500).send(
    { error: err.name, code: err.code, message: err.message }
  );
});

app.listen(config.port, () => {
  console.log(`Listening on port ${config.port}.`);
});
