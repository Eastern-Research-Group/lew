const log4js = require('log4js');

log4js.configure({
  appenders: {
    stdout: { type: 'stdout', layout: { type: 'pattern', pattern: '%p - %m' } },
    stdoutFilter: {
      type: 'logLevelFilter',
      appender: 'stdout',
      level: 'TRACE',
      maxLevel: 'WARN',
    },
    stderr: { type: 'stderr', layout: { type: 'pattern', pattern: '%p - %m' } },
    stderrFilter: {
      type: 'logLevelFilter',
      appender: 'stderr',
      level: 'ERROR',
      maxLevel: 'FATAL',
    },
  },
  categories: {
    default: { appenders: ['stderrFilter', 'stdoutFilter'], level: 'all' },
  },
});

const logger = log4js.getLogger();

if (process.env.LOGGER_LEVEL)
  logger.level = process.env.LOGGER_LEVEL.toUpperCase();
else logger.level = 'INFO'; //default level

logger.info('LOGGER_LEVEL = ' + logger.level);

const getLogger = function () {
  return logger;
};

//We use this function to format most of the error messages to
//work well (support the review) with Cloud.gov (Kibana)
exports.formatLogMsg = function (app_metadata, app_message, app_otherinfo) {
  let rtn_obj = { app_metadata: null, app_message: null, app_otherinfo: null };

  if (app_metadata != null) rtn_obj.app_metadata = app_metadata;
  if (app_message != null) rtn_obj.app_message = app_message;
  if (app_otherinfo != null) rtn_obj.app_otherinfo = app_otherinfo;

  return JSON.stringify(rtn_obj);
};

exports.logger = getLogger();
