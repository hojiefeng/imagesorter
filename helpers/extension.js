mime = require('mime-types');
module.exports =  function(a) {
  return mime.extension(a);
};
