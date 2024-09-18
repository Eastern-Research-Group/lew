const assert = require('assert');
const expect = require('chai').expect;
const should = require('chai').should();
const httpMocks = require('node-mocks-http');
const chai = require('chai');


describe('ServerCheck', () => {
    it('Ensure Express app validity', () => {
        let app;
        expect(() => {
          app = require('../app');
        }).to.not.throw();
      });

});
