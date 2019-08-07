var request = require("request");
var parser = require("fast-xml-parser");
const logger = require("../utilities/logger.js");
const log = logger.logger;

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
    ("00" + (this.getMonth() + 1)).substr(-2) + "/" + ("00" + this.getDate()).substr(-2) + "/" + this.getFullYear()
  );
};

/***********************************************************************
 * Default route
 ***********************************************************************/
module.exports.calculateRFactor = async (req, res) => {
  var rFactor = 0;
  var start_date = null;
  var end_date = null;
  var location = null;

  let metadataObj = populateMetdataObj(req);

  /********************************************************* 
    Check the existence and then validate api_key or X-Api-User-Id
  *********************************************************/

  var err_json = null;
  if (
    (req.hostname !== "localhost" && req.header("X-Api-User-Id") === undefined) ||
    (req.hostname === "localhost" &&
      req.query.api_key === undefined &&
      (req.hostname === "localhost" && req.header("X-Api-Key") === undefined))
  ) {
    err_json = { error_id: 1, error_msg: "Missing API Identifier" };
    log.warn(logger.formatLogMsg(metadataObj, err_json));
  } else {
    var api_user_id = req.header("X-Api-User-Id");
    log.debug(logger.formatLogMsg(metadataObj, "API User ID = " + api_user_id));
  }

  if (err_json != null) {
    res.status(400).json(err_json);
    return;
  }

  /********************************************************* 
    Check the existence and then validate start date
  *********************************************************/
  var err_json = null;
  if (req.query.start_date === undefined) {
    err_json = { error_id: 20, error_msg: "Missing start date parameter" };
    log.warn(logger.formatLogMsg(metadataObj, err_json));
  } else {
    start_date = new Date(req.query.start_date);
    if (start_date.isValid() == false) {
      err_json = { error_id: 21, error_msg: "Invalid start date parameter" };
      log.warn(logger.formatLogMsg(metadataObj, err_json));
    }
  }

  if (err_json != null) {
    res.status(400).json(err_json);
    return;
  }

  log.debug("req.query.start_date = " + req.query.start_date);
  //reformat start_date to take into account UTC
  start_date = new Date(start_date.getUTCFullYear(), start_date.getUTCMonth(), start_date.getUTCDate());
  log.debug("start_date = " + start_date);

  /********************************************************* 
    Check the existence and then validate end date
  *********************************************************/
  err_json = null;
  if (req.query.end_date === undefined) {
    err_json = { error_id: 30, error_msg: "Missing end date parameter" };
    log.warn(logger.formatLogMsg(metadataObj, err_json));
  } else {
    end_date = new Date(req.query.end_date);
    if (end_date.isValid() == false) {
      err_json = { error_id: 31, error_msg: "Invalid end date parameter" };
      log.warn(logger.formatLogMsg(metadataObj, err_json));
    }
  }

  if (err_json != null) {
    res.status(400).json(err_json);
    return;
  }
  log.debug("req.query.end_date = " + req.query.end_date);
  //reformat start_date to take into account UTC
  end_date = new Date(end_date.getUTCFullYear(), end_date.getUTCMonth(), end_date.getUTCDate());
  log.debug("end_date = " + end_date);

  /********************************************************* 
    Start date must be before End date
  *********************************************************/
  err_json = null;
  if (start_date > end_date) {
    err_json = {
      error_id: 35,
      error_msg: "Start date must occur before end date"
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
    err_json = { error_id: 40, error_msg: "Missing location parameter" };
    log.warn(logger.formatLogMsg(metadataObj, err_json));
  } else {
    try {
      location = JSON.parse(req.query.location);
    } catch (err) {
      err_json = { error_id: 41, error_msg: "Invalid location parameter" };
      log.warn(logger.formatLogMsg(metadataObj, err_json));
    }

    if (
      err_json == null &&
      (location == null ||
        location.geometry == null ||
        location.geometry.coordinates == null ||
        location.geometry.coordinates.length != 2)
    ) {
      err_json = { error_id: 42, error_msg: "Invalid location parameter" };
      log.warn(logger.formatLogMsg(metadataObj, err_json));
    }
  }

  if (err_json != null) {
    res.status(400).json(err_json);
    return;
  }

  /********************************************************* 
    Beginning code from legacy LEW
  *********************************************************/

  log.debug("start_date = " + start_date);
  log.debug("end_date = " + end_date);

  var setDate = [start_date.formatMMDDYYYY(), end_date.formatMMDDYYYY()];
  log.debug("setDate = " + setDate);

  var setMonth = [
    Number(setDate[0].substring(0, setDate[0].indexOf("/"))) - 1,
    Number(setDate[1].substring(0, setDate[1].indexOf("/"))) - 1
  ];
  log.debug("setMonth = " + setMonth);

  var setDay = [
    Number(setDate[0].substring(setDate[0].indexOf("/") + 1, setDate[0].lastIndexOf("/"))),
    Number(setDate[1].substring(setDate[1].indexOf("/") + 1, setDate[1].lastIndexOf("/")))
  ];

  log.debug("setDay = " + setDay);

  var setYear = [
    Number(setDate[0].substring(setDate[0].lastIndexOf("/") + 1)),
    Number(setDate[1].substring(setDate[1].lastIndexOf("/") + 1))
  ];

  log.debug("setYear = " + setYear);

  var monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var dayIndex = setDay;
  for (b = 0; b < setMonth.length; b++) {
    for (c = 0; c < setMonth[b]; c++) {
      dayIndex[b] = dayIndex[b] + monthDays[c];
    }
  }

  log.debug("dayIndex = " + dayIndex);

  var lon = location.geometry.coordinates[0];
  var lat = location.geometry.coordinates[1];

  try {
    const url = await getCountyURL(metadataObj, lon, lat);
    const EI_DAILY_AMOUNT = await getClimateDataForCounty(metadataObj, url);
    const rFactor_1 = await calculateRFactor(metadataObj, EI_DAILY_AMOUNT, setYear, dayIndex);
    return await sendResponse(metadataObj, rFactor_1, res);
  } catch (err) {
    res.status(400).json(err);
  }
};

/***********************************************************************
 *
 ***********************************************************************/
function sendResponse(metadataObj, rFactor, res) {
  return new Promise((resolve, reject) => {
    var out = { rfactor: Number(rFactor) };
    res.json(out);
    log.info(logger.formatLogMsg(metadataObj, out));
    resolve();
    return;
  });
}

/***********************************************************************
 
***********************************************************************/
function getCountyURL(metadataObj, lon, lat) {
  return new Promise((resolve, reject) => {
    var postData =
      '{"metainfo":{"mode":"sync","keep_results":"3600000"},"parameter":[{"name":"latitude","value":' +
      lat +
      '},{"name":"longitude","value":' +
      lon +
      "}]}";

    request(
      {
        method: "post",
        body: postData,
        uri: "http://csip.engr.colostate.edu:8088/csip-misc/d/r2climate/2.0",
        timeout: 15000
      },
      function(err, res, body) {
        if (err) {
          var err_json = {
            error_id: 60,
            error_msg: "Error retrieving county URL"
          };
          log.error(logger.formatLogMsg(metadataObj, err_json, { postData: postData }));
          reject(err_json);
          return;
        } else {
          if (res.statusCode != 200) {
            var err_json = {
              error_id: 61,
              error_msg: "Error calling RUSLE web service"
            };
            log.error(logger.formatLogMsg(metadataObj, err_json, "statusCode = " + res.statusCode));
            reject(err_json);
            return;
          }

          var results = null;
          try {
            results = JSON.parse(body).result;
          } catch (err) {
            var err_json = {
              error_id: 62,
              error_msg: "Error parsing results of county data"
            };
            log.error(logger.formatLogMsg(metadataObj, err_json, { postData: postData, ERR: err.toString() }));
            reject(err_json);
            return;
          }

          if (results == null) {
            var err_json = {
              error_id: 63,
              error_msg: "rFactor information is not available for this location"
            };
            log.error(
              logger.formatLogMsg(metadataObj, err_json, {
                OtherMSG: "Error retrieving county URL information from the results array.",
                postData: postData
              })
            );
            reject(err_json);
            return;
          }

          for (var i = 0, len = results.length; i < len; i++) {
            if (results[i].name === "climate") {
              const url = results[i].value;
              var info_json = {
                success: "true",
                climate_url: url,
                postData: postData
              };
              log.info(logger.formatLogMsg(metadataObj, "Climate data found", { postData: postData }));
              resolve(url);
              return;
            }
          }
          var err_json = {
            error_id: 64,
            error_msg: "Error retrieving county URL"
          };
          log.error(logger.formatLogMsg(metadataObj, err_json, null));
          reject(err_json);
          return;
        }
      }
    );
  });
}

/***********************************************************************
 
***********************************************************************/
function getClimateDataForCounty(metadataObj, countyURL) {
  return new Promise((resolve, reject) => {
    log.debug("countyURL = " + countyURL);
    request(
      {
        method: "get",
        uri: countyURL,
        timeout: 15000
      },
      function(err, res, body) {
        if (err || res.statusCode != 200) {
          var err_json = {
            error_id: 70,
            error_msg: "Error retrieving county level data."
          };
          //GOOD ONES
          log.debug("Debug message: there should be an ERROR message right after this one!!!");
          log.error("im an error and should be in error log");
          log.error(logger.formatLogMsg(metadataObj, "simple error string #3.", null));
          log.error(logger.formatLogMsg(metadataObj, "simple error string."));

          //BAD ONES
          log.error(logger.formatLogMsg(metadataObj, "simple error string #2.", "simple error string part 2."));
          log.error(logger.formatLogMsg(metadataObj, "simple error string #4.", "4"));
          log.error(logger.formatLogMsg(metadataObj, "simple error string #4.", ""));
          log.error(logger.formatLogMsg(metadataObj, metadataObj, metadataObj));
          log.error(logger.formatLogMsg(metadataObj, metadataObj));
          log.error("im an error and should be in error log #2");
          log.error(logger.formatLogMsg(metadataObj, err_json));

          reject(err_json);
          return;
        } else {
          var xmlData = res.body;
          if (parser.validate(xmlData) === true) {
            //optional (it'll return an object in case it's not valid)
            var jsonObj = parser.parse(xmlData);
            // find EI_DAILY_AMOUNT
            for (var i = 0, len = jsonObj.Obj.Flt.length; i < len; i++) {
              if (jsonObj.Obj.Flt[i].Name === "EI_DAILY_AMOUNT") {
                resolve(jsonObj.Obj.Flt[i].Calc);
                return;
              }
            }
          }

          var err_json = {
            error_id: 71,
            error_msg: "Climate attribute not found."
          };
          log.error(logger.formatLogMsg(metadataObj, err_json, { countyURL: countyURL }));
          reject(err_json);
          return;
        }
      }
    );
  }); // promise
}

/***********************************************************************
 
***********************************************************************/
function calculateRFactor(metadataObj, EI_DAILY_AMOUNT, setYear, dayIndex) {
  return new Promise((resolve, reject) => {
    log.debug("setYear = " + setYear);
    log.debug("dayIndex = " + dayIndex);

    if (EI_DAILY_AMOUNT == null) {
      var err_json = {
        error_id: 80,
        error_msg: "15: Internal Web Service Error. [EI_DAILY_AMOUNT is empty]"
      };
      log.error(logger.formatLogMsg(null, err_json, null));
      reject(err_json);
    } else {
      var dailyEIData = EI_DAILY_AMOUNT.replace(/\n/g, " ").split(" ");
      log.debug("dailyEIData length = " + dailyEIData.length);
      rFactor = 0;
      if (setYear[1] > setYear[0]) {
        dayIndex[1] = dayIndex[1] + 365 * (setYear[1] - setYear[0]);
      }
      for (p = dayIndex[0]; p < dayIndex[1] + 1; p++) {
        rFactor = rFactor + Number(dailyEIData[p - 365 * Math.floor(p / 365)]);
      }

      log.debug("rFactor = " + rFactor);

      if (rFactor < 10) {
        rFactor = rFactor.toPrecision(3);
      } else if (rFactor >= 10 && rFactor < 99) {
        rFactor = rFactor.toPrecision(4);
      } else {
        rFactor = Math.round(rFactor);
      }
    }
    log.debug("rFactor = " + rFactor);
    log.debug(logger.formatLogMsg(metadataObj, "rFactor = " + rFactor, null));

    resolve(rFactor);
  });
}

/***********************************************************************
Populate Metadata Object with HTTP headers we care about
***********************************************************************/
function populateMetdataObj(request) {
  let metadata = {};

  metadata.b3 = request.header("b3") === undefined ? null : request.header("b3");
  metadata.x_b3_traceid = request.header("x-b3-traceid") === undefined ? null : request.header("x-b3-traceid");
  metadata.x_b3_spanid = request.header("x-b3-spanid") === undefined ? null : request.header("x-b3-spanid");
  metadata.x_b3_parentspanid =
    request.header("x_b3_parentspanid") === undefined ? null : request.header("x_b3_parentspanid");
  metadata.x_api_key = request.header("X-Api-Key") === undefined ? null : request.header("X-Api-Key");
  metadata.x_api_user_id = request.header("x-api-user-id") === undefined ? null : request.header("x-api-user-id");
  metadata.x_api_umbrella_request_id =
    request.header("x-api-umbrella-request-id") === undefined ? null : request.header("x-api-umbrella-request-id");

  return metadata;
}
