var express = require('express');
var router = express.Router();
var images = require('../models/images');


/* GET home page. */

router.get('/', function(req, res, next) {
  res.redirect('/images');
});

module.exports = router;
