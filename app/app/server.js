const express = require("express");
const helmet = require("helmet");
var cors = require("cors");
var favicon = require("serve-favicon");
const basicAuth = require("express-basic-auth");
var path = require("path");
const logger = require("./server/utilities/logger.js");

const app = express();
app.use(helmet());
app.use(helmet.noCache());
app.use(cors());
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
  isLocal = "local" === process.env.NODE_ENV.toLowerCase();
  isDevelopment = "development" === process.env.NODE_ENV.toLowerCase();
  isStaging = "staging" === process.env.NODE_ENV.toLowerCase();
}

if (isLocal) log.info("Environment = local");
if (isDevelopment) log.info("Environment = development");
if (isStaging) log.info("Environment = staging");
if (!isLocal && !isDevelopment && !isStaging) log.info("Environment = staging or production");

/****************************************************************
 Setup basic auth for non-staging and non-production
****************************************************************/
if (isDevelopment || isStaging) {
  var user_json = '{"' + process.env.LEW_BASIC_AUTH_USER_NAME + '" : "' + process.env.LEW_BASIC_AUTH_USER_PWD + '"}';
  user_obj = JSON.parse(user_json);

  log.error("user_json-" + user_json + "-");

  app.use(
    basicAuth({
      users: user_obj,
      challenge: true,
      unauthorizedResponse: getUnauthorizedResponse
    })
  );
}

function getUnauthorizedResponse(req) {
  return req.auth ? "Invalid credentials" : "No credentials provided";
}

/****************************************************************
 Setup server and routes
****************************************************************/
app.use("/", express.static(path.join(__dirname, "public"), { index: ["index.html"] }));
app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

/****************************************************************
 Enable CORS/Preflight/OPTIONS request
****************************************************************/
app.options("*", cors());

/****************************************************************
 Custom application routes
****************************************************************/
require("./server/routes/index")(app);

/****************************************************************
 Worse case error handling for 404 and 500 issues
****************************************************************/
app.use(function(req, res, next) {
  res.sendFile(path.join(__dirname, "public", "404.html"));
});

app.use(function(err, req, res, next) {
  res.sendFile(path.join(__dirname, "public", "500.html"));
});

//For local testing of the production flow, use the same port as browersync to avoid
//different port usage to confuse testers/developers
if (port === 9090 && isLocal === false) {
  port = browserSync_port;
}

app.listen(port, function() {
  if (isLocal) {
    const browserSync = require("browser-sync");

    log.info(`Application listening on port ${browserSync_port}`);
    browserSync({
      files: [path.join(__dirname, "/public/**")],
      online: false,
      open: false,
      port: browserSync_port,
      proxy: "localhost:" + port,
      ui: false
    });
  } else {
    log.info(`Application listening on port ${port}`);
  }
});
