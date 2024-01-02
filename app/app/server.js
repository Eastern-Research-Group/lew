const express = require('express');
const helmet = require('helmet');
const noCache = require('nocache');
const cors = require('cors');
const favicon = require('serve-favicon');
const basicAuth = require('express-basic-auth');
const path = require('path');
const logger = require('./server/utilities/logger.js');

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
const log = logger.logger;
let port = process.env.PORT || 9090;
const browserSync_port = 9091;

/****************************************************************
 Which environment
****************************************************************/
let isLocal = false;
let isDevelopment = false;
let isStaging = false;

if (process.env.NODE_ENV) {
  isLocal = 'local' === process.env.NODE_ENV.toLowerCase();
  isDevelopment = 'development' === process.env.NODE_ENV.toLowerCase();
  isStaging = 'staging' === process.env.NODE_ENV.toLowerCase();
}

if (isLocal) log.info('Environment = local');
if (isDevelopment) log.info('Environment = development');
if (isStaging) log.info('Environment = staging');
if (!isLocal && !isDevelopment && !isStaging)
  log.info('Environment = staging or production');

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
  res.status(404).sendFile(path.join(__dirname, 'public', '400.html'));
});

app.use(function (err, req, res, next) {
  res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});

//For local testing of the production flow, use the same port as browersync to avoid
//different port usage to confuse testers/developers
if (port === 9090 && isLocal === false) {
  port = browserSync_port;
}

app.listen(port, function () {
  if (isLocal) {
    const browserSync = require('browser-sync');

    log.info(`Application listening on port ${browserSync_port}`);
    browserSync({
      files: [path.join(__dirname, '/public/**')],
      online: false,
      open: false,
      port: browserSync_port,
      proxy: 'localhost:' + port,
      ui: false,
    });
  } else {
    log.info(`Application listening on port ${port}`);
  }
});
