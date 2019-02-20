const express = require('express');
var favicon = require('serve-favicon');
const basicAuth = require('express-basic-auth');
var path = require('path');
const logger = require('./server/utilities/logger.js');

const app = express();
var log = logger.logger;
var port = process.env.PORT || 9090;
const browserSync_port = 9091;

/****************************************************************
 Which environment
****************************************************************/
var isLocal = false;
var isDevelopment = false;
var isStaging = false;

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
 Local environment only
****************************************************************/
if (isLocal) {
  var browserSync = require('browser-sync');

  var bsconf = {
    port: browserSync_port,
    proxy: 'localhost:' + port,
    https: false,
    notify: false,
    open: true,
    online: false,
    ui: false,
    files: [path.join(__dirname, '/public/**')]
  };

  var bs = browserSync.create().init(bsconf);

  app.use(require('connect-browser-sync')(bs));
}

/****************************************************************
 Setup basic auth for non-staging and non-production
****************************************************************/
if (isDevelopment || isStaging) {
  app.use(
    basicAuth({
      users: { lew: 'lew12!' },
      challenge: true,
      unauthorizedResponse: getUnauthorizedResponse
    })
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
  express.static(path.join(__dirname, 'public'), { index: ['index.html'] })
);
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

require('./server/routes/index')(app);

//For local testing of the production flow, use the same port as browersync to avoid
//different port usage to confuse testers/developers
if (port === 9090 && isLocal === false) {
  port = browserSync_port;
}

app.listen(port, function() {
  if (isLocal) log.info(`Application listening on port ${browserSync_port}`);
  else log.info(`Application listening on port ${port}`);
});

/****************************************************************
 Worse case error handling for 404 and 500 issues
****************************************************************/
app.use(function(req, res, next) {
  res.sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use(function(err, req, res, next) {
  res.sendFile(path.join(__dirname, 'public', '500.html'));
});
