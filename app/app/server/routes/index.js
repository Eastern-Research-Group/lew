module.exports = function(app) {
  require('./health')(app);

  require('./rfactor')(app);
};
