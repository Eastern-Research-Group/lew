const rp = require('request-promise');
var parser = require('fast-xml-parser');
const logger = require('../utilities/logger.js');
const log = logger.logger;

var metadataObj;
var url = 'http://csip.engr.colostate.edu:8088/csip-misc/d/r2climate/2.0';

Date.prototype.isValid = function () {
  // An invalid date object returns NaN for getTime() and NaN is the only
  // object not strictly equal to itself.

  // if date.getTime() is NaN the date is invalid
  return !isNaN(this.getTime());
};

function getDayOfYear(date) {
  var start = new Date(date.getFullYear(), 0, 0);
  var diff =
    date -
    start +
    (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  var oneDay = 1000 * 60 * 60 * 24;
  var day = Math.floor(diff / oneDay);
  return day;
}

function getCountyUrl(metadataObj, lat, lon) {
  return new Promise((resolve, reject) => {
    var options = {
      method: 'POST',
      uri: url,
      // uri: 'https://httpstat.us/400',
      body: {
        metainfo: {
          mode: 'sync',
          keep_results: '3600000',
        },
        parameter: [
          {
            name: 'latitude',
            value: lat,
          },
          {
            name: 'longitude',
            value: lon,
          },
        ],
      },
      headers: {
        'Content-Type': 'application/json',
      },
      json: true,
      resolveWithFullResponse: true,
    };
    rp(options)
      .then(function (response) {
        log.debug('county URL statusCode = ' + response.statusCode);

        if (response.statusCode != 200) {
          var err_json = {
            error_id: 61,
            error_msg: 'Error calling RUSLE web service',
          };
          log.error(
            logger.formatLogMsg(
              metadataObj,
              err_json,
              'statusCode = ' + response.statusCode,
            ),
          );
          reject(err_json);
          return;
        } else {
          var results = null;
          try {
            results = response.body.result;
          } catch (err) {
            err_json = {
              error_id: 62,
              error_msg: 'Error parsing results of county data',
            };
            log.error(
              logger.formatLogMsg(metadataObj, err_json, {
                postData: postData,
                ERR: err.toString(),
              }),
            );
            reject(err_json);
            return;
          }

          if (!results) {
            err_json = {
              error_id: 63,
              error_msg:
                'rFactor information is not available for this location',
            };
            log.error(
              logger.formatLogMsg(metadataObj, err_json, {
                OtherMSG:
                  'Error retrieving county URL information from the results array.',
                postData: options,
              }),
            );
            reject(err_json);
            return;
          }

          for (var i = 0, len = results.length; i < len; i++) {
            if (results[i].name === 'climate') {
              const resultUrl = results[i].value;
              log.debug(
                logger.formatLogMsg(metadataObj, 'Climate data found', {
                  postData: options,
                }),
              );
              resolve(resultUrl);
              return;
            }
          }
        }
      })
      .catch(function (err) {
        if (err) {
          var err_json = {
            error_id: 60,
            error_msg: 'Error retrieving county URL',
          };
          log.error(
            logger.formatLogMsg(metadataObj, err_json, { postData: options }),
          );
          reject(err_json);
          return;
        }
      });
  });
}

function getClimateData(metadataObj, countyUrl) {
  return new Promise((resolve, reject) => {
    var options = {
      method: 'GET',
      uri: countyUrl,
      // uri: 'https://httpstat.us/402',
      headers: {
        'Content-Type': 'application/xml',
      },
      resolveWithFullResponse: true,
    };
    rp(options)
      .then(function (response) {
        log.debug('climate data statusCode = ' + response.statusCode);

        if (response.statusCode != 200) {
          var err_json = {
            error_id: 70,
            error_msg: 'Error retrieving county level data.',
          };
          log.error(
            logger.formatLogMsg(metadataObj, err_json, {
              countyURL: countyUrl,
            }),
          );
          reject(err_json);
          return;
        } else {
          var xmlData = response.body;
          if (parser.validate(xmlData) === true) {
            var jsonObj = parser.parse(xmlData);
            // find EI_DAILY_AMOUNT
            for (var i = 0, len = jsonObj.Obj.Flt.length; i < len; i++) {
              if (jsonObj.Obj.Flt[i].Name === 'EI_DAILY_AMOUNT') {
                resolve(jsonObj.Obj.Flt[i].Calc);
                return;
              }
            }
          }
        }
      })
      .catch(function (err) {
        if (err) {
          var err_json = {
            error_id: 71,
            error_msg: 'Climate attribute not found.',
          };
          log.error(
            logger.formatLogMsg(metadataObj, err_json, {
              countyURL: countyUrl,
            }),
          );
          reject(err_json);
          return;
        }
      });
  });
}

function calculateRFactor(metadataObj, EI_DAILY_AMOUNT, start_date, end_date) {
  return new Promise((resolve, reject) => {
    if (!EI_DAILY_AMOUNT) {
      var err_json = {
        error_id: 80,
        error_msg: '15: Internal Web Service Error. [EI_DAILY_AMOUNT is empty]',
      };
      log.error(logger.formatLogMsg(null, err_json, null));
      reject(err_json);
      return;
    }

    var dailyEIdata = EI_DAILY_AMOUNT.replace(/\n/g, ' ').split(' ');
    var rfactor = 0;

    log.debug('start_date = ' + start_date);
    log.debug('end_date = ' + end_date);
    // find number of days the project spans
    // add one day to end date because timestamp is set to midnight for both dates,
    // but want to include end date in count
    var numProjectDays =
      (end_date.getTime() + 1000 * 3600 * 24 - start_date.getTime()) /
      (1000 * 3600 * 24);
    log.debug('numProjectDays = ' + numProjectDays);

    if (numProjectDays >= 365) {
      log.debug(
        'Project spans one year or longer; rFactor maxed out at 1 year',
      );
      for (let p = 0; p < 365; p++) {
        rfactor = rfactor + Number(dailyEIdata[p]);
      }
    } else {
      var startDayOfYear = getDayOfYear(start_date);
      var endDayOfYear = getDayOfYear(end_date);

      if (endDayOfYear > startDayOfYear) {
        log.debug('Project is contained within a year');
        // subtract 1 from startDayOfYear because index on dailyEIdata starts with 0
        for (let p = startDayOfYear - 1; p < endDayOfYear; p++) {
          rfactor = rfactor + Number(dailyEIdata[p]);
        }
      } else {
        log.debug('Project crosses end of year');
        // dayCounter variable ensures all days of project span are counted, even if a leap day is included
        var dayCounter = 0;
        // first calculate from start date to 12/31
        // subtract 1 from startDayOfYear because index on dailyEIdata starts with 0
        for (let p = startDayOfYear - 1; p < 365; p++) {
          rfactor = rfactor + Number(dailyEIdata[p]);
          dayCounter++;
        }
        log.debug('dayCounter = ' + dayCounter);

        var daysRemaining = numProjectDays - dayCounter;
        // then start at 1/1 and go for number of days remaining in project
        log.debug('daysRemaining = ' + daysRemaining);
        for (let p = 0; p < daysRemaining; p++) {
          rfactor = rfactor + Number(dailyEIdata[p]);
          dayCounter++;
          // log.debug('rfactor = ' + rfactor);
        }
        log.debug('dayCounter = ' + dayCounter);
      }
    }
    // log.debug('rfactor = '' + rfactor);

    // decide precision of rFactor
    if (rfactor < 10) {
      rfactor = rfactor.toPrecision(3);
    } else if (rfactor >= 10 && rfactor < 99) {
      rfactor = rfactor.toPrecision(4);
    } else {
      rfactor = Math.round(rfactor);
    }
    log.debug('rfactor = ' + rfactor);
    log.debug(logger.formatLogMsg(metadataObj, 'rFactor = ' + rfactor, null));
    resolve(rfactor);
  });
}

var sendResponse = function sendResponse(metadataObj, rfactor, res) {
  return new Promise((resolve, reject) => {
    var out = { rfactor: Number(rfactor) };
    res.json(out);
    log.info(logger.formatLogMsg(metadataObj, out));
    resolve();
    return;
  });
};

/***********************************************************************
Populate Metadata Object with HTTP headers we care about
***********************************************************************/
function populateMetdataObj(request) {
  let metadata = {};

  metadata.b3 =
    request.header('b3') === undefined ? null : request.header('b3');
  metadata.x_b3_traceid =
    request.header('x-b3-traceid') === undefined
      ? null
      : request.header('x-b3-traceid');
  metadata.x_b3_spanid =
    request.header('x-b3-spanid') === undefined
      ? null
      : request.header('x-b3-spanid');
  metadata.x_b3_parentspanid =
    request.header('x_b3_parentspanid') === undefined
      ? null
      : request.header('x_b3_parentspanid');
  metadata.x_api_key =
    request.header('X-Api-Key') === undefined
      ? null
      : request.header('X-Api-Key');
  metadata.x_api_user_id =
    request.header('x-api-user-id') === undefined
      ? null
      : request.header('x-api-user-id');
  metadata.x_api_umbrella_request_id =
    request.header('x-api-umbrella-request-id') === undefined
      ? null
      : request.header('x-api-umbrella-request-id');

  return metadata;
}

/***********************************************************************
 * Default route
 ***********************************************************************/
module.exports.calculateRFactor = async (req, res) => {
  var start_date = null;
  var end_date = null;
  var location = null;

  metadataObj = populateMetdataObj(req);

  /********************************************************* 
    Check the existence and then validate api_key or X-Api-User-Id
    *********************************************************/
  var err_json = null;
  if (
    (req.hostname !== 'localhost' &&
      req.header('X-Api-User-Id') === undefined) ||
    (req.hostname === 'localhost' &&
      req.query.api_key === undefined &&
      req.hostname === 'localhost' &&
      req.header('X-Api-Key') === undefined)
  ) {
    err_json = {
      error_id: 1,
      error_msg: 'Missing API Identifier',
    };
    log.warn(logger.formatLogMsg(metadataObj, err_json));
  } else {
    var api_user_id = req.header('X-Api-User-Id');
    log.debug(logger.formatLogMsg(metadataObj, 'API User ID = ' + api_user_id));
  }

  if (err_json != null) {
    res.status(400).json(err_json);
    return;
  }

  /********************************************************* 
    Check the existence and then validate start date
    *********************************************************/
  err_json = null;
  if (req.query.start_date === undefined) {
    err_json = {
      error_id: 20,
      error_msg: 'Missing start date parameter',
    };
    log.warn(logger.formatLogMsg(metadataObj, err_json));
  } else {
    start_date = new Date(req.query.start_date);
    if (!start_date.isValid()) {
      err_json = {
        error_id: 21,
        error_msg: 'Invalid start date parameter',
      };
      log.warn(logger.formatLogMsg(metadataObj, err_json));
    }
  }

  if (err_json != null) {
    res.status(400).json(err_json);
    return;
  }

  log.debug('req.query.start_date = ' + req.query.start_date);
  //reformat start_date to take into account UTC
  start_date = new Date(
    start_date.getUTCFullYear(),
    start_date.getUTCMonth(),
    start_date.getUTCDate(),
  );
  log.debug('start_date = ' + start_date);

  /********************************************************* 
    Check the existence and then validate end date
    *********************************************************/
  err_json = null;
  if (req.query.end_date === undefined) {
    err_json = {
      error_id: 30,
      error_msg: 'Missing end date parameter',
    };
    log.warn(logger.formatLogMsg(metadataObj, err_json));
  } else {
    end_date = new Date(req.query.end_date);
    if (!end_date.isValid()) {
      err_json = {
        error_id: 31,
        error_msg: 'Invalid end date parameter',
      };
      log.warn(logger.formatLogMsg(metadataObj, err_json));
    }
  }

  if (err_json != null) {
    res.status(400).json(err_json);
    return;
  }
  log.debug('req.query.end_date = ' + req.query.end_date);
  //reformat start_date to take into account UTC
  end_date = new Date(
    end_date.getUTCFullYear(),
    end_date.getUTCMonth(),
    end_date.getUTCDate(),
  );
  log.debug('end_date = ' + end_date);

  /********************************************************* 
    Start date must be before End date
    *********************************************************/
  err_json = null;
  if (start_date > end_date) {
    err_json = {
      error_id: 35,
      error_msg: 'Start date must occur before end date',
    };
    log.warn(logger.formatLogMsg(metadataObj, err_json));
  }

  if (err_json != null) {
    res.status(400).json(err_json);
    return;
  }

  /********************************************************* 
    GeoJSON validation
    *********************************************************/
  err_json = null;
  if (req.query.location === undefined) {
    err_json = {
      error_id: 40,
      error_msg: 'Missing location parameter',
    };
    log.warn(logger.formatLogMsg(metadataObj, err_json));
  } else {
    try {
      location = JSON.parse(req.query.location);
    } catch (err) {
      err_json = {
        error_id: 41,
        error_msg: 'Invalid location parameter',
      };
      log.warn(logger.formatLogMsg(metadataObj, err_json));
    }

    if (
      !err_json &&
      (!location ||
        !location.geometry ||
        !location.geometry.coordinates ||
        location.geometry.coordinates.length !== 2)
    ) {
      err_json = {
        error_id: 42,
        error_msg: 'Invalid location parameter',
      };
      log.warn(logger.formatLogMsg(metadataObj, err_json));
    }
  }

  if (err_json != null) {
    res.status(400).json(err_json);
    return;
  }

  log.debug('start_date = ' + start_date);
  log.debug('end_date = ' + end_date);

  /***********************************************************************
   *
   ***********************************************************************/
  var lon = location.geometry.coordinates[0];
  var lat = location.geometry.coordinates[1];

  try {
    const countyUrl = await getCountyUrl(metadataObj, lat, lon);
    const eiDailyAmount = await getClimateData(metadataObj, countyUrl);
    const rfactor = await calculateRFactor(
      metadataObj,
      eiDailyAmount,
      start_date,
      end_date,
    );
    await sendResponse(metadataObj, rfactor, res);
  } catch (err) {
    res.status(400).json(err);
  }
};
