var express = require('express');
var router = express.Router();
var multer  = require('multer');
var upload = multer({ dest: 'uploads/' })
var mime = require('mime-types')
var images = require('../models/images');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require("fs"));
var crypto = require('crypto')
var gm = require('gm').subClass({imageMagick: true});
Promise.promisifyAll(gm.prototype);
var _ = require('lodash');

/* GET images listing. */
router.get('/', function(req, res, next) {

  var query = req.query.query;
  //defaults
  var perpage = parseInt(req.query.perpage || 10);
  var page = parseInt(req.query.page || 1);

  Promise.join(images.getRange((page-1) * perpage, perpage,query), images.count(),
  function(images, count){
    var size = images.length || 0;
    var count = count || 0;
    var pages = [];

    if(size==0 && count!=0 && !query)
    {
      res.redirect('/');
      return;
    }

    //TODO: even if last page is full its likely that there may not be a next page
    if(page > 1) pages.push({number: page-1});
    pages.push({number: page, active: 1});
    if(size == perpage) pages.push({number: page+1}); //has it reached last page?

    for(var i = 0;i<size;i++)
    {
      images[i].number = (page-1)*perpage + i + 1;
    }

    res.render('index', { title: 'Images' , images: images, pages: pages, query: query, hasprev: pages[0] == page-1, hasnext: pages[pages.length - 1] == page+1});
  })
});



router.get('/upload', function(req, res, next) {
  res.render('imageupload', { title: 'Image Upload' });
});

router.post('/upload', upload.single('image'), function(req, res, next) {
  if(!req.file){
    res.render('imageupload', {error: 'No image file uploaded!'});
    return;
  }
  if(!req.file.mimetype.startsWith('image') && !req.file.mimetype.startsWith('video')){
    fs.unlink(req.file.path, function(){});
    res.render('imageupload', {error: 'File is not an image or video. Type: ' + req.file.mimetype});
    return;
  }

  //dedupe files using MD5
  var hashstream = fs.createReadStream(req.file.path).pipe(crypto.createHash('md5').setEncoding('hex'));
  hashstream.on('finish', function () {
    var hash = this.read();
    var filename;
    images.findByHash(hash)
    .then(function(test){
      if(test)//if it already exists just ignore
      {
        res.render('imageupload', {duplicate: test._id});
        throw 'Duplicate!'
      }
      filename = hash + '.' + mime.extension(req.file.mimetype)
      return fs.renameAsync(req.file.path, 'public/uploads/' + filename);
    })
    .then(function(){
      fs.unlink(req.file.path, function(){});

      if(req.file.mimetype == 'image/gif')
        gm('public/uploads/' + filename).selectFrame(0).thumbnail('125x125').write('public/thumbnails/' + hash + '.jpeg', function(err){console.log(err)});
      else
        gm('public/uploads/' + filename).thumbnail('125x125').write('public/thumbnails/' + hash + '.jpeg', function(err){console.log(err)});

      return gm('public/uploads/' + filename).sizeAsync();
    })
    .then(function(size){
      var image = {
        character: req.body.character,
        emotion: req.body.emotion,
        text: req.body.text,
        tags: req.body.tags,
        comments: req.body.comments,
        size: req.file.size,
        mimetype: req.file.mimetype,
        hash: hash,
        width: size.width,
        height: size.height
      };
      return images.add(image)
    })
    .then(function(image){
      res.redirect('/images/' + image._id);
    })
    .catch(function(error){
      console.log(error);
      fs.unlink(req.file.path, function(){});
      res.render('imageupload', {error: 'An error occured'});
    });
  })
});


router.get('/:id', function(req, res, next) {
  images.get(req.params.id)
  .then(function(image){
    res.render('image', image);
  })
});



router.put('/:id', function(req, res, next) {
  var filtered = _.pick(req.body, ['character', 'emotion', 'text', 'tags', 'comments']);
  filtered.updated = new Date();
  images.update(req.params.id, filtered)
  .then(function(image){
    res.send(JSON.stringify({message: 'Success', success: 0}));
  })
  .catch(function(error){
    console.log(error);
    res.send(JSON.stringify({message: 'Something went wrong', error: 0}));
  });
});

router.delete('/:id', function(req, res, next) {
  images.delete(req.params.id)
  .then(function(image){
    res.send(JSON.stringify({message: 'Success', success: 0}));
  })
  .catch(function(error){
    res.send(JSON.stringify({message: 'Something went wrong', error: 0}));
  });
});

module.exports = router;
