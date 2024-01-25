const express = require('express');
const logger = require('../utilities/logger.js');
const rfactorContoller = require('../controllers/rfactor.js');

module.exports = function (app) {
  const router = express.Router();

  router.get('/', rfactorContoller.calculateRFactor);

  app.use('/v1/rfactor', router);
};
