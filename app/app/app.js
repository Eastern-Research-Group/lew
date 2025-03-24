const path = require('path');
const express = require('express');
const helmet = require('helmet');
const noCache = require('nocache');
const cors = require('cors');
const favicon = require('serve-favicon');
const basicAuth = require('express-basic-auth');
const { getEnvironment } = require('./server/utilities/environment');
const logger = require('./server/utilities/logger');
const log = logger.logger;

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(noCache());
app.use(
  helmet.hsts({
    maxAge: 31536000,
  }),
);

app.use(cors());

/****************************************************************
 Which environment
****************************************************************/
const { isLocal, isTest, isDevelopment, isStaging } = getEnvironment();

if (isLocal) {
  log.info('Environment = local');
  app.enable('isLocal');
} else if (isTest) {
  log.info('Environment = test');
  app.enable('isTest');
}

if (isDevelopment) log.info('Environment = development');
if (isStaging) log.info('Environment = staging');
if (!isLocal && !isTest && !isDevelopment && !isStaging)
  log.info('Environment = preprod or production');

/****************************************************************
 Setup basic auth for non-staging and non-production
****************************************************************/
if (isDevelopment || isStaging) {
  if (
    process.env.LEW_BASIC_AUTH_USER_NAME == null ||
    process.env.LEW_BASIC_AUTH_USER_PWD == null
  ) {
    log.error(
      'Either the basic LEW user name or password environmental variable is not set.',
    );
  }

  const user_json =
    '{"' +
    process.env.LEW_BASIC_AUTH_USER_NAME +
    '" : "' +
    process.env.LEW_BASIC_AUTH_USER_PWD +
    '"}';
  const user_obj = JSON.parse(user_json);

  app.use(
    basicAuth({
      users: user_obj,
      challenge: true,
      unauthorizedResponse: getUnauthorizedResponse,
    }),
  );
}

function getUnauthorizedResponse(req) {
  return req.auth ? 'Invalid credentials' : 'No credentials provided';
}

/****************************************************************
 Setup server and routes
****************************************************************/
app.use(
  '/',
  express.static(path.join(__dirname, 'public'), { index: ['index.html'] }),
);
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

/****************************************************************
 Enable CORS/Preflight/OPTIONS request
****************************************************************/
app.options('*', cors());

/****************************************************************
 Custom application routes
****************************************************************/
require('./server/routes/index')(app);

/****************************************************************
 Worst case error handling for 404 and 500 issues
****************************************************************/
app.use(function (req, res, next) {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use(function (err, req, res, next) {
  res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});

module.exports = app;