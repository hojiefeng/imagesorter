var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
mongoose.connect('mongodb://localhost/imagesorter', {useMongoClient: true});
module.exports = mongoose;
