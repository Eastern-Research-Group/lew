var express = require('express');
var request = require('request');
var parser = require('fast-xml-parser');
const logger = require('../utilities/logger.js');
const log = logger.logger;

//http://localhost:9090/rfactor?start_date=02/21/2019&end_date=02/28/2019

module.exports = function(app) {
  var router = express.Router();

  router.get('/', function(req, res, next) {
    var rFactor = 0;
    log.info('Time: ', Date.now());
    log.info('req.query.start_date: ' + req.query.start_date);
    log.info('req.query.end_date: ' + req.query.end_date);

    /* Date stuff from legacy LEW */
    var setDate = [req.query.start_date + '', req.query.end_date + ''];
    var setMonth = [
      Number(setDate[0].substring(0, setDate[0].indexOf('/'))) - 1,
      Number(setDate[1].substring(0, setDate[1].indexOf('/'))) - 1
    ];
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
    var setYear = [
      Number(setDate[0].substring(setDate[0].lastIndexOf('/') + 1)),
      Number(setDate[1].substring(setDate[1].lastIndexOf('/') + 1))
    ];
    var monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var dayIndex = setDay;
    for (b = 0; b < setMonth.length; b++) {
      for (c = 0; c < setMonth[b]; c++) {
        dayIndex[b] = dayIndex[b] + monthDays[c];
      }
    }

    console.log('setYear=' + setYear.toString());
    console.log('dayIndex=' + dayIndex.toString());

    new Promise(function(resolve, reject) {
      resolve();
    })
      .then(getCountyURL)
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
    log.info('sending response');
    //res.send(rFactor)
    var out = { rfactor: Number(rFactor) };
    res.json(out);
    resolve();
  });
}

/***********************************************************************
 
***********************************************************************/
function getCountyURL() {
  log.info('getCountyURL');

  return new Promise((resolve, reject) => {
    log.info('inside getCountyURL promise');

    var postData =
      '{"metainfo":{"mode":"sync","keep_results":"3600000"},"parameter":[{"name":"latitude","value":38.440191},{"name":"longitude","value":-78.87508}]}';

    var options = {
      method: 'post',
      body: postData,
      uri: 'http://csip.engr.colostate.edu:8088/csip-misc/d/r2climate/2.0',
      timeout: 15000
    };

    request(
      {
        method: 'post',
        body: postData,
        uri: 'http://csip.engr.colostate.edu:8088/csip-misc/d/r2climate/2.0',
        timeout: 15000
      },
      function(err, res, body) {
        if (err) {
          log.error("i'm an error");
          reject(err);
        } else {
          results = JSON.parse(body).result;
          for (var i = 0, len = results.length; i < len; i++) {
            if (results[i].name === 'climate') {
              const url = results[i].value;
              resolve(url);
            }
          }
          reject('climate attribute not found.');
        }
      }
    );
  });
}

/***********************************************************************
 
***********************************************************************/
function getClimateDataForCounty(countyURL) {
  log.info('getClimateDataForCounty');

  return new Promise((resolve, reject) => {
    console.info('inside getClimateDataForCounty promise');

    request(
      {
        method: 'get',
        uri: countyURL,
        timeout: 15000
      },
      function(err, res, body) {
        if (err) {
          log.error("i'm an error");
          reject(err);
        } else {
          var xmlData = res.body;
          if (parser.validate(xmlData) === true) {
            //optional (it'll return an object in case it's not valid)
            var jsonObj = parser.parse(xmlData);
            // find EI_DAILY_AMOUNT
            for (var i = 0, len = jsonObj.Obj.Flt.length; i < len; i++) {
              if (jsonObj.Obj.Flt[i].Name === 'EI_DAILY_AMOUNT') {
                console.info('EI_DAILY_AMOUNT: ' + jsonObj.Obj.Flt[i].Calc);
                console.info('EI_DAILY_AMOUNT: ' + jsonObj.Obj.Flt[i].Calc);
                resolve(jsonObj.Obj.Flt[i].Calc);
              }
            }
          }

          reject('climate attribute not found.');
        }
      }
    );
  }); // promise
}

/***********************************************************************
 
***********************************************************************/
function calculateRFactor(EI_DAILY_AMOUNT, setYear, dayIndex) {
  return new Promise((resolve, reject) => {
    if (EI_DAILY_AMOUNT == null) {
      reject(Error('EI_DAILY_AMOUNT is empty'));
    } else {
      //console.info('EI_DAILY_AMOUNT Length=' + EI_DAILY_AMOUNT.length);
      //console.info('EI_DAILY_AMOUNT=' + EI_DAILY_AMOUNT);

      console.log('EI_DAILY_AMOUNT.length=' + EI_DAILY_AMOUNT.length);
      console.log('setYear again=' + setYear.toString());
      console.log('dayIndex again=' + dayIndex.toString());

      var dailyEIData = EI_DAILY_AMOUNT.replace(/\n/g, ' ').split(' ');
      for (i = 0; i < dailyEIData.length; i++) {
        console.log(i + '=' + dailyEIData[i]);
      }

      console.log('dailyEIData len = ' + dailyEIData.length);
      //console.log('dailyEIData tostring = ' + dailyEIData.toString());

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

      if (rFactor < 10) {
        rFactor = rFactor.toPrecision(3);
      } else if (rFactor >= 10 && rFactor < 99) {
        rFactor = rFactor.toPrecision(4);
      } else {
        rFactor = Math.round(rFactor);
      }
    }

    resolve(rFactor);
  });
}
