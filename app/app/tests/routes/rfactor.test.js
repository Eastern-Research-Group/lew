const assert = require('assert');
const expect = require('chai').expect;
const should = require('chai').should();
const httpMocks = require('node-mocks-http');

var chai = require('chai');

const rfactorContoller = require('../../server/controllers/rfactor');

describe('rFactor controller testing', () => {
  /****************************************************
   *
   ****************************************************/
  it('rFactor valid statusCode and JSON results test', function(done) {
    var request = httpMocks.createRequest({
      method: 'GET',
      url: '/',
      query: {
        start_date: '2019-02-21',
        end_date: '2019-02-28',
        location:
          '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}',
        api_key: 'yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5'
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        data.should.have.property('rfactor');
        data.rfactor.should.eql(0.356);
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it('Missing api-key test', function(done) {
    var request = httpMocks.createRequest({
      method: 'GET',
      url: '/',
      query: {
        start_date: '2019-02-21',
        end_date: '2019-02-28',
        location:
          '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}'
      }
    });

    var response = httpMocks.createResponse();

    let rtn = rfactorContoller.calculateRFactor(request, response);
    rtn
      .then(function(result) {
        var data = JSON.parse(response._getData());
        response.statusCode.should.eql(400);
        data.should.eql({
          error_id: 1,
          error_msg: 'Missing API Key parameter'
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it('Missing start_date test', function(done) {
    var request = httpMocks.createRequest({
      method: 'GET',
      url: '/',
      query: {
        end_date: '2019-02-28',
        location:
          '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}',
        api_key: 'yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5'
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
          error_msg: 'Missing start date parameter'
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it('Invalid start_date test', function(done) {
    var request = httpMocks.createRequest({
      method: 'GET',
      url: '/',
      query: {
        start_date: 'asdfsafsa',
        end_date: '2019-02-28',
        location:
          '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}',
        api_key: 'yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5'
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
          error_msg: 'Invalid start date parameter'
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it('Missing end_date test', function(done) {
    var request = httpMocks.createRequest({
      method: 'GET',
      url: '/',
      query: {
        start_date: '2019-02-21',
        location:
          '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}',
        api_key: 'yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5'
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
          error_msg: 'Missing end date parameter'
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it('Invalid end_date test', function(done) {
    var request = httpMocks.createRequest({
      method: 'GET',
      url: '/',
      query: {
        start_date: '2019-02-21',
        end_date: 'asdfsdfsa',
        location:
          '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}',
        api_key: 'yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5'
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
          error_msg: 'Invalid end date parameter'
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it('Start date must occur before end date test', function(done) {
    var request = httpMocks.createRequest({
      method: 'GET',
      url: '/',
      query: {
        start_date: '2019-02-21',
        end_date: '2019-02-20',
        location:
          '{"geometry":{"type":"Point","coordinates":[-87.845556,42.582222]}}',
        api_key: 'yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5'
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
          error_msg: 'Start date must occur before end date'
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it('Missing location test', function(done) {
    var request = httpMocks.createRequest({
      method: 'GET',
      url: '/',
      query: {
        start_date: '2019-02-21',
        end_date: '2019-02-22',
        api_key: 'yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5'
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
          error_msg: 'Missing location parameter'
        });
        done();
      })
      .catch(done);
  });

  /****************************************************
   *
   ****************************************************/
  it('Invalid location test', function(done) {
    var request = httpMocks.createRequest({
      method: 'GET',
      url: '/',
      query: {
        start_date: '2019-02-21',
        end_date: '2019-02-28',
        location: '{"geometry":{"type":"Po}}',
        api_key: 'yCM9DKRltA4gTGovk2naSvodO5iUDBCT7FAJ3CF5'
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
          error_msg: 'Invalid location parameter'
        });
        done();
      })
      .catch(done);
  });
});
