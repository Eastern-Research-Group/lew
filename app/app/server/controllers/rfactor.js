const axios = require('axios');
const { XMLParser, XMLValidator } = require('fast-xml-parser');
const logger = require('../utilities/logger.js');
const log = logger.logger;
const parser = new XMLParser();

const url = 'https://csip.engr.colostate.edu:9088/csip-misc/d/r2climate/2.0';

Date.prototype.isValid = function () {
  // An invalid date object returns NaN for getTime() and NaN is the only
  // object not strictly equal to itself.

  // if date.getTime() is NaN the date is invalid
  return !isNaN(this.getTime());
};

function isLeapYear(date) {
  return new Date(date.getFullYear(), 1, 29).getDate() === 29;
}

function buildLeapYearData(data) {
  const leapYearData = [...data];

  // get data for Feb 28th
  const feb28Data = data[58];

  // insert Feb 28th value in for Feb 29th
  leapYearData.splice(59, 0, feb28Data);

  return leapYearData;
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff =
    date -
    start +
    (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getCountyUrl(metadataObj, lat, lon) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      url,
      // url: 'https://httpstat.us/400',
      data: {
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
    };
    axios(options)
      .then(function (response) {
        log.debug('county URL status = ' + response.status);

        let err_json = {};
        if (response.status != 200) {
          err_json = {
            error_id: 61,
            error_msg: 'Error calling RUSLE web service',
          };
          log.error(
            logger.formatLogMsg(
              metadataObj,
              err_json,
              'status = ' + response.status,
            ),
          );
          reject(err_json);
          return;
        } else {
          let results = null;
          try {
            results = response.data.result;
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

          for (let i = 0, len = results.length; i < len; i++) {
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
          const err_json = {
            error_id: 60,
            error_msg: 'Error retrieving county URL',
          };
          log.error(
            logger.formatLogMsg(metadataObj, err_json, { postData: options }),
          );
          reject(err_json);
        }
      });
  });
}

function getClimateData(metadataObj, countyUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      url: countyUrl,
      // url: 'https://httpstat.us/402',
      headers: {
        'Content-Type': 'application/xml',
      },
    };
    axios(options)
      .then(function (response) {
        log.debug('climate data status = ' + response.status);

        if (response.status != 200) {
          const err_json = {
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
          const xmlData = response.data;
          if (XMLValidator.validate(xmlData) === true) {
            const jsonObj = parser.parse(xmlData);
            // find EI_DAILY_AMOUNT
            for (let i = 0, len = jsonObj.Obj.Flt.length; i < len; i++) {
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
          const err_json = {
            error_id: 71,
            error_msg: 'Climate attribute not found.',
          };
          log.error(
            logger.formatLogMsg(metadataObj, err_json, {
              countyURL: countyUrl,
            }),
          );
          reject(err_json);
        }
      });
  });
}

function calculateRFactor(metadataObj, EI_DAILY_AMOUNT, start_date, end_date) {
  return new Promise((resolve, reject) => {
    if (!EI_DAILY_AMOUNT) {
      const err_json = {
        error_id: 80,
        error_msg: '15: Internal Web Service Error. [EI_DAILY_AMOUNT is empty]',
      };
      log.error(logger.formatLogMsg(null, err_json, null));
      reject(err_json);
      return;
    }

    const dailyEIdataNormal = EI_DAILY_AMOUNT.replace(/\n/g, ' ').split(' ');
    const dailyEIdataLeapYear = buildLeapYearData(dailyEIdataNormal);
    let rfactor = 0;

    const isStartLeapYear = isLeapYear(start_date);
    const isEndLeapYear = isLeapYear(end_date);

    log.debug('start_date = ' + start_date);
    log.debug('end_date = ' + end_date);
    log.debug('isStartLeapYear = ' + isStartLeapYear);
    log.debug('isEndLeapYear = ' + isEndLeapYear);

    // find number of days the project spans
    // add one day to end date because timestamp is set to midnight for both dates,
    // but want to include end date in count
    const numProjectDays =
      (end_date.getTime() + 1000 * 3600 * 24 - start_date.getTime()) /
      (1000 * 3600 * 24);
    log.debug('numProjectDays = ' + numProjectDays);

    if (numProjectDays >= 365) {
      log.debug(
        'Project spans one year or longer; rFactor maxed out at 1 year',
      );
      for (let p = 0; p < 365; p++) {
        rfactor = rfactor + Number(dailyEIdataNormal[p]);
      }
    } else {
      const startDayOfYear = getDayOfYear(start_date);
      const endDayOfYear = getDayOfYear(end_date);

      if (endDayOfYear > startDayOfYear) {
        log.debug('Project is contained within a year');

        // determine whether or not the leap year data is needed for the start year
        let dailyEIdata = dailyEIdataNormal;
        if (isStartLeapYear || isEndLeapYear) dailyEIdata = dailyEIdataLeapYear;

        // subtract 1 from startDayOfYear because index on dailyEIdata starts with 0
        for (let p = startDayOfYear - 1; p < endDayOfYear; p++) {
          rfactor = rfactor + Number(dailyEIdata[p]);
        }
      } else {
        log.debug('Project crosses end of year');

        // determine whether or not the leap year data is needed for the start year
        let dailyEIdata = dailyEIdataNormal;
        if (isStartLeapYear) dailyEIdata = dailyEIdataLeapYear;

        // dayCounter variable ensures all days of project span are counted, even if a leap day is included
        let dayCounter = 0;
        // first calculate from start date to 12/31
        // subtract 1 from startDayOfYear because index on dailyEIdata starts with 0
        const numDays = isStartLeapYear ? 366 : 365;
        for (let p = startDayOfYear - 1; p < numDays; p++) {
          rfactor = rfactor + Number(dailyEIdata[p]);
          dayCounter++;
        }
        log.debug('dayCounter = ' + dayCounter);

        // determine whether or not the leap year data is needed for the end year
        if (isEndLeapYear) dailyEIdata = dailyEIdataLeapYear;
        else dailyEIdata = dailyEIdataNormal;

        const daysRemaining = numProjectDays - dayCounter;
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

const sendResponse = function sendResponse(metadataObj, rfactor, res) {
  return new Promise((resolve, reject) => {
    const out = { rfactor: Number(rfactor) };
    res.json(out);
    log.info(logger.formatLogMsg(metadataObj, out));
    resolve();
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
  let start_date = null;
  let end_date = null;
  let location = null;

  const metadataObj = populateMetdataObj(req);

  /********************************************************* 
    Check the existence and then validate api_key or X-Api-User-Id
    *********************************************************/
  let err_json = null;
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
    const api_user_id = req.header('X-Api-User-Id');
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
      (!location?.geometry?.coordinates ||
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
  const lon = location.geometry.coordinates[0];
  const lat = location.geometry.coordinates[1];

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
