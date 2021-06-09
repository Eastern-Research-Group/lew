const assert = require("assert");
const expect = require("chai").expect;
const should = require("chai").should();
const httpMocks = require("node-mocks-http");
const nock = require("nock");

var chai = require("chai");

const rfactorContoller = require("../../server/controllers/rfactor");

const colostateDomain = 'http://csip.engr.colostate.edu:8088';
const r2climate = '/csip-misc/d/r2climate/2.0';

describe("rFactor controller testing", () => {
  /****************************************************
   *
   ****************************************************/
  it("rFactor valid statusCode and JSON results test", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      url: "/",
      headers: {
        "X-Api-User-Id": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "2019-02-21",
        end_date: "2019-02-28",
        location: '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}'
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        data.should.have.property("rfactor");
        data.rfactor.should.eql(0.305);
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Missing X-Api-User-Id test", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      hostname: "lew.epa.gov",
      url: "/",
      headers: {
        "MISSING-X-Api-User-Id-TEST": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "2019-02-21",
        end_date: "2019-02-28",
        location: '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}'
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        response.statusCode.should.eql(400);
        data.should.eql({ error_id: 1, error_msg: "Missing API Identifier" });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Missing X-Api-User-Id from other domain test", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      hostname: "lew-app.app.cloud.gov",
      url: "/",
      headers: {
        "MISSING-X-Api-User-Id-TEST": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "2019-02-21",
        end_date: "2019-02-28",
        location: '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}',
        api_key: "UNIT_TEST_USER_KEY"
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        response.statusCode.should.eql(400);
        data.should.eql({ error_id: 1, error_msg: "Missing API Identifier" });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Missing X-Api-User-Id localhost workaround using api_key parameter", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      hostname: "localhost",
      url: "/",
      headers: {
        "MISSING-X-Api-User-Id-TEST": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "2019-02-21",
        end_date: "2019-02-28",
        location: '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}',
        api_key: "UNIT_TEST_USER_KEY"
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        response.statusCode.should.eql(200);
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Missing X-Api-User-Id localhost workaround using api_key header", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      hostname: "localhost",
      url: "/",
      headers: {
        "MISSING-X-Api-User-Id-TEST": "UNIT_TEST_USER_ID",
        "X-Api-Key": "UNIT_TEST_USER_KEY"
      },
      query: {
        start_date: "2019-02-21",
        end_date: "2019-02-28",
        location: '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}'
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        response.statusCode.should.eql(200);
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Missing start_date test", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      url: "/",
      headers: {
        "X-Api-User-Id": "UNIT_TEST_USER_ID"
      },
      query: {
        end_date: "2019-02-28",
        location: '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}',
        api_key: "yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5"
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        response.statusCode.should.eql(400);
        data.should.eql({
          error_id: 20,
          error_msg: "Missing start date parameter"
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Invalid start_date test", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      url: "/",
      headers: {
        "X-Api-User-Id": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "asdfsafsa",
        end_date: "2019-02-28",
        location: '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}',
        api_key: "yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5"
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        response.statusCode.should.eql(400);
        data.should.eql({
          error_id: 21,
          error_msg: "Invalid start date parameter"
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Missing end_date test", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      url: "/",
      headers: {
        "X-Api-User-Id": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "2019-02-21",
        location: '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}',
        api_key: "yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5"
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        response.statusCode.should.eql(400);
        data.should.eql({
          error_id: 30,
          error_msg: "Missing end date parameter"
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Invalid end_date test", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      url: "/",
      headers: {
        "X-Api-User-Id": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "2019-02-21",
        end_date: "asdfsdfsa",
        location: '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}',
        api_key: "yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5"
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        response.statusCode.should.eql(400);
        data.should.eql({
          error_id: 31,
          error_msg: "Invalid end date parameter"
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Start date must occur before end date test", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      url: "/",
      headers: {
        "X-Api-User-Id": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "2019-02-21",
        end_date: "2019-02-20",
        location: '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}',
        api_key: "yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5"
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        response.statusCode.should.eql(400);
        data.should.eql({
          error_id: 35,
          error_msg: "Start date must occur before end date"
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Missing location test", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      url: "/",
      headers: {
        "X-Api-User-Id": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "2019-02-21",
        end_date: "2019-02-22",
        api_key: "yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5"
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        response.statusCode.should.eql(400);
        data.should.eql({
          error_id: 40,
          error_msg: "Missing location parameter"
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Invalid location test", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      url: "/",
      headers: {
        "X-Api-User-Id": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "2019-02-21",
        end_date: "2019-02-28",
        location: '{"geometry":{"type":"Po}}',
        api_key: "yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5"
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        response.statusCode.should.eql(400);
        data.should.eql({
          error_id: 41,
          error_msg: "Invalid location parameter"
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Cross construction two year rFactor test", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      url: "/",
      headers: {
        "X-Api-User-Id": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "2018-02-21",
        end_date: "2019-02-21",
        location: '{"geometry":{"type":"Point","coordinates":[-76.4899,38.4401]}}'
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        data.should.have.property("rfactor");
        data.rfactor.should.eql(193);
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Cross construction leap year rFactor test", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      url: "/",
      headers: {
        "X-Api-User-Id": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "2020-02-28",
        end_date: "2020-03-01",
        location: '{"geometry":{"type":"Point","coordinates":[-76.4899,38.4401]}}'
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        data.should.have.property("rfactor");
        data.rfactor.should.eql(0.779);
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Cross construction non-leap year rFactor test", function(done) {
    var request = httpMocks.createRequest({
      method: "GET",
      url: "/",
      headers: {
        "X-Api-User-Id": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "2021-02-28",
        end_date: "2021-03-01",
        location: '{"geometry":{"type":"Point","coordinates":[-76.4899,38.4401]}}'
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        data.should.have.property("rfactor");
        data.rfactor.should.eql(0.516);
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Climate information not available for location to calculate rFactor test", function(done) {
    nock(colostateDomain)
      .post(r2climate).reply(200, {
        metainfo: {},
        parameter: [],
        // leave result off to simulate no results
      });
   
    var request = httpMocks.createRequest({
      method: "GET",
      url: "/",
      headers: {
        "X-Api-User-Id": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "2019-02-21",
        end_date: "2019-02-28",
        location: '{"geometry":{"type":"Point","coordinates":[-14.062500,48.224673]}}',
        api_key: "yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5"
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        response.statusCode.should.eql(400);
        data.should.eql({
          error_id: 63,
          error_msg: "rFactor information is not available for this location"
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it("Error retreiving county URL", function(done) {
    nock(colostateDomain)
      .post(r2climate).reply(500, {
        metainfo: {},
        parameter: [],
        // leave result off to simulate no results
      });
    
    var request = httpMocks.createRequest({
      method: "GET",
      url: "/",
      headers: {
        "X-Api-User-Id": "UNIT_TEST_USER_ID"
      },
      query: {
        start_date: "2019-02-21",
        end_date: "2019-02-28",
        location: '{"geometry":{"type":"Point","coordinates":[-76.4899,38.4401]}}',
        api_key: "yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5"
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        response.statusCode.should.eql(400);
        data.should.eql({
          error_id: 60,
          error_msg: "Error retrieving county URL"
        });
        done();
      })
      .catch(done);
  });
});
