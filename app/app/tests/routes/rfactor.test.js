const assert = require('assert');
const expect = require('chai').expect;
const should = require('chai').should();
const httpMocks = require('node-mocks-http');

var chai = require('chai');

const rfactorContoller = require('../../server/controllers/rfactor');

describe('rFactor controller testing', () => {
  it('rFactor valid statusCode and JSON results test', function(done) {
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
        data.should.have.property('rfactor');
        data.rfactor.should.eql(0.356);
        done();
      })
      .catch(done);
  });
});
