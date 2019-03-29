var express = require('express');
var request = require('request');
var parser = require('fast-xml-parser');
const logger = require('../utilities/logger.js');
const log = logger.logger;

//http://localhost:9090/rfactor?start_date=02/21/2019&end_date=02/28/2019

module.exports = function(app) {
  var router = express.Router();

  /**************************************************************** 
     Update JS Date object to have validate function and formatter
  ****************************************************************/
  Date.prototype.isValid = function() {
    // An invalid date object returns NaN for getTime() and NaN is the only
    // object not strictly equal to itself.
    return this.getTime() === this.getTime();
  };

  Date.prototype.formatMMDDYYYY = function() {
    return (
      ('00' + (this.getMonth() + 1)).substr(-2) +
      '/' +
      ('00' + this.getDate()).substr(-2) +
      '/' +
      this.getFullYear()
    );
  };

  /**************************************************************** 
     rfactor GET route
  ****************************************************************/
  router.get('/', function(req, res, next) {
    var rFactor = 0;
    var start_date = null;
    var end_date = null;
    var location = null;

    /********************************************************* 
      Check the existence and then validate start date
    *********************************************************/
    var err_json = null;
    if (req.query.start_date === undefined) {
      err_json = { error_id: 1, error_msg: 'Missing start date parameter' };
      log.warn(err_json);
    } else {
      start_date = new Date(req.query.start_date);
      if (start_date.isValid() == false) {
        err_json = { error_id: 2, error_msg: 'Invalid start date parameter' };
        log.warn(err_json);
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
      start_date.getUTCDate()
    );
    log.debug('start_date = ' + start_date);

    /********************************************************* 
      Check the existence and then validate end date
    *********************************************************/
    err_json = null;
    if (req.query.end_date === undefined) {
      err_json = { error_id: 3, error_msg: 'Missing end date parameter' };
      log.warn(err_json);
    } else {
      end_date = new Date(req.query.end_date);
      if (end_date.isValid() == false) {
        err_json = { error_id: 4, error_msg: 'Invalid end date parameter' };
        log.warn(err_json);
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
      end_date.getUTCDate()
    );
    log.debug('end_date = ' + end_date);

    /********************************************************* 
      GeoJSON validation
    *********************************************************/
    err_json = null;
    if (req.query.location === undefined) {
      err_json = { error_id: 5, error_msg: 'Missing location parameter' };
      log.warn(err_json);
    } else {
      try {
        location = JSON.parse(req.query.location);
      } catch (err) {
        err_json = { error_id: 6, error_msg: 'Invalid location parameter' };
        log.warn(err_json);
      }

      if (
        err_json == null &&
        (location == null ||
          location.geometry == null ||
          location.geometry.coordinates == null ||
          location.geometry.coordinates.length != 2)
      ) {
        err_json = { error_id: 7, error_msg: 'Invalid location parameter' };
        log.warn(err_json);
      }
    }

    if (err_json != null) {
      res.status(400).json(err_json);
      return;
    }

    /********************************************************* 
      Beginning code from legacy LEW
    *********************************************************/

    log.debug('start_date = ' + start_date);
    log.debug('end_date = ' + end_date);

    var setDate = [start_date.formatMMDDYYYY(), end_date.formatMMDDYYYY()];
    log.debug('setDate = ' + setDate);

    var setMonth = [
      Number(setDate[0].substring(0, setDate[0].indexOf('/'))) - 1,
      Number(setDate[1].substring(0, setDate[1].indexOf('/'))) - 1
    ];
    log.debug('setMonth = ' + setMonth);

    var setDay = [
      Number(
        setDate[0].substring(
          setDate[0].indexOf('/') + 1,
          setDate[0].lastIndexOf('/')
        )
      ),
      Number(
        setDate[1].substring(
          setDate[1].indexOf('/') + 1,
          setDate[1].lastIndexOf('/')
        )
      )
    ];

    log.debug('setDay = ' + setDay);

    var setYear = [
      Number(setDate[0].substring(setDate[0].lastIndexOf('/') + 1)),
      Number(setDate[1].substring(setDate[1].lastIndexOf('/') + 1))
    ];

    log.debug('setYear = ' + setYear);

    var monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var dayIndex = setDay;
    for (b = 0; b < setMonth.length; b++) {
      for (c = 0; c < setMonth[b]; c++) {
        dayIndex[b] = dayIndex[b] + monthDays[c];
      }
    }

    log.debug('dayIndex = ' + dayIndex);

    var lon = location.geometry.coordinates[0];
    var lat = location.geometry.coordinates[1];

    new Promise(function(resolve, reject) {
      resolve();
    })
      .then(() => {
        return getCountyURL(lon, lat);
      })
      .then((url) => {
        return getClimateDataForCounty(url);
      })
      .then((EI_DAILY_AMOUNT) => {
        return calculateRFactor(EI_DAILY_AMOUNT, setYear, dayIndex);
      })
      .then((rFactor) => sendResponse(rFactor, res))
      .catch(function(err) {
        log.error(err);
        res.send(err);
      });
  });

  app.use('/rfactor', router);
};

/***********************************************************************
 *
 ***********************************************************************/
function sendResponse(rFactor, res) {
  return new Promise((resolve, reject) => {
    //res.send(rFactor)
    var out = { rfactor: Number(rFactor) };
    res.json(out);
    resolve();
    return;
  });
}

/***********************************************************************
 
***********************************************************************/
function getCountyURL(lon, lat) {
  return new Promise((resolve, reject) => {
    var postData =
      '{"metainfo":{"mode":"sync","keep_results":"3600000"},"parameter":[{"name":"latitude","value":' +
      lat +
      '},{"name":"longitude","value":' +
      lon +
      '}]}';

    request(
      {
        method: 'post',
        body: postData,
        uri: 'http://csip.engr.colostate.edu:8088/csip-misc/d/r2climate/2.0',
        timeout: 15000
      },
      function(err, res, body) {
        if (err) {
          var err_json = {
            error_id: 8,
            error_msg: 'Error retrieving county URL. postData = ' + postData
          };
          log.error(err_json + err.toString());
          reject('8: Error retrieving county URL');
          return;
        } else {
          if (res.statusCode != 200) {
            var err_json = {
              error_id: 9,
              error_msg: 'Error calling the Colorado web service'
            };
            log.error(err_json + err.toString());
            reject('09: Error retrieving county URL');
            return;
          }

          var results = null;
          try {
            results = JSON.parse(body).result;
          } catch (err) {
            var err_json = {
              error_id: 10,
              error_msg:
                'Error parsiing results of county data. postData = ' + postData
            };
            log.error(err_json + err.toString());
            reject('10: Error parsiing results of county data');
            return;
          }

          if (results == null) {
            var err_json = {
              error_id: 11,
              error_msg:
                'Error retrieving county URL information from the results array. postData = ' +
                postData
            };
            log.error(err_json + err.toString());
            reject('11: Error retrieving county URL');
            return;
          }

          for (var i = 0, len = results.length; i < len; i++) {
            if (results[i].name === 'climate') {
              const url = results[i].value;
              var info_json = {
                success: 'true',
                postData: postData
              };
              log.info(info_json);
              resolve(url);
              return;
            }
          }
          var err_json = {
            error_id: 12,
            error_msg: 'Error retrieving county URL'
          };
          log.error(err_json);
          reject('12: Error retrieving county URL');
          return;
        }
      }
    );
  });
}

/***********************************************************************
 
***********************************************************************/
function getClimateDataForCounty(countyURL) {
  return new Promise((resolve, reject) => {
    log.debug('countyURL = ' + countyURL);
    request(
      {
        method: 'get',
        uri: countyURL,
        timeout: 15000
      },
      function(err, res, body) {
        if (err) {
          var err_json = {
            error_id: 13,
            error_msg:
              'Error retrieving county level data. The countyURL =' + countyURL
          };
          log.error(err_json + ' ' + err.toString());
          reject('13: Error retrieving county level data');
          return;
        } else {
          var xmlData = res.body;
          if (parser.validate(xmlData) === true) {
            //optional (it'll return an object in case it's not valid)
            var jsonObj = parser.parse(xmlData);
            // find EI_DAILY_AMOUNT
            for (var i = 0, len = jsonObj.Obj.Flt.length; i < len; i++) {
              if (jsonObj.Obj.Flt[i].Name === 'EI_DAILY_AMOUNT') {
                resolve(jsonObj.Obj.Flt[i].Calc);
                return;
              }
            }
          }

          var err_json = {
            error_id: 14,
            error_msg:
              'Climate attribute not found. The countyURL = ' + countyURL
          };
          log.error(err_json);
          reject(
            '14: Internal Web Service Error. [Climate attribute not found.]'
          );
          return;
        }
      }
    );
  }); // promise
}

/***********************************************************************
 
***********************************************************************/
function calculateRFactor(EI_DAILY_AMOUNT, setYear, dayIndex) {
  return new Promise((resolve, reject) => {
    log.debug('setYear = ' + setYear);
    log.debug('dayIndex = ' + dayIndex);

    if (EI_DAILY_AMOUNT == null) {
      reject(
        Error('15: Internal Web Service Error. [EI_DAILY_AMOUNT is empty]')
      );
    } else {
      var dailyEIData = EI_DAILY_AMOUNT.replace(/\n/g, ' ').split(' ');
      log.debug('dailyEIData length = ' + dailyEIData.length);
      rFactor = 0;
      if (setYear[1] > setYear[0]) {
        dayIndex[1] = dayIndex[1] + 365 * (setYear[1] - setYear[0]);
      }
      for (p = dayIndex[0]; p < dayIndex[1] + 1; p++) {
        if (p % 365 == 0) {
          rFactor = rFactor + Number(dailyEIData[365]);
        } else {
          rFactor =
            rFactor + Number(dailyEIData[p - 365 * Math.floor(p / 365)]);
        }
      }

      log.debug('rFactor = ' + rFactor);

      if (rFactor < 10) {
        rFactor = rFactor.toPrecision(3);
      } else if (rFactor >= 10 && rFactor < 99) {
        rFactor = rFactor.toPrecision(4);
      } else {
        rFactor = Math.round(rFactor);
      }
    }
    log.debug('rFactor = ' + rFactor);
    resolve(rFactor);
  });
}
