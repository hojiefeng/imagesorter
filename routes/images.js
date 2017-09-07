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
var request = require('request');

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

var processimage = Promise.promisify(function(file, callback) {
  var hashstream = fs.createReadStream(file.path).pipe(crypto.createHash('md5').setEncoding('hex'));
  hashstream.on('finish', function () {
    var hash = this.read();
    var filename = hash + '.' + mime.extension(file.mimetype)
    fs.renameAsync(file.path, 'public/uploads/' + filename)
    .then(function(){
      fs.unlink(file.path, function(){});

      if(file.mimetype == 'image/gif')
        gm('public/uploads/' + filename).selectFrame(0).thumbnail('125x125').write('public/thumbnails/' + hash + '.jpeg', function(err){console.log(err)});
      else
        gm('public/uploads/' + filename).thumbnail('125x125').write('public/thumbnails/' + hash + '.jpeg', function(err){console.log(err)});

      return gm('public/uploads/' + filename).sizeAsync();
    })
    .then(function(size){
      return {
        width: size.width,
        height: size.height,
        hash: hash,
        filename: filename
      };
    })
    .asCallback(callback);
  });
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
  var hash, obj
  //dedupe files using MD5
  processimage(req.file)
  .then(function(processed){
    hash = processed.hash;
    filename = processed.filename;
    obj = processed;
    return images.findByHash(hash)
  })
  .then(function(test){
    console.log(test, hash);
    if(test)//if it already exists just ignore
    {
      res.render('imageupload', {duplicate: test._id});
      throw 'Duplicate!'
    }
    fs.unlink(req.file.path, function(){});
    var image = {
      character: req.body.character,
      emotion: req.body.emotion,
      text: req.body.text,
      tags: req.body.tags,
      comments: req.body.comments,
      size: req.file.size,
      mimetype: req.file.mimetype,
      hash: obj.hash,
      width: obj.width,
      height: obj.height
    };
    return images.add(image)
  })
  .then(function(image){
    res.redirect('/images/' + image._id);
  })
  .catch(function(error){
    console.log(error);
    fs.unlink(req.file.path, function(){});
    if(error != 'Duplicate!')res.render('imageupload', {error: 'An error occured'});
  });
});


router.get('/batchupload', function(req, res, next) {
  res.render('imageuploadmultiple', { title: 'Image Batch Upload' });
});

router.post('/batchupload', upload.any(), function(req, res, next) {
  if(!req.files){
    res.render('imageuploadmultiple', {error: 'No image file uploaded!'});
    return;
  }
  var numfiles = req.files.length;

  if(numfiles != req.body.commentsmultiple.length ||
    numfiles != req.body.tagsmultiple.length ||
    numfiles != req.body.emotionmultiple.length ||
    numfiles != req.body.charactermultiple.length ||
    numfiles != req.body.textmultiple.length)
  {
    res.render('imageuploadmultiple', { error: "Some fields dont tally! Different number of different input fields."})
    return;
  }

  var inserts = []
  for(var i = 0;i<numfiles;i++)
  {
    if(!req.files[i].mimetype.startsWith('image') && !req.files[i].mimetype.startsWith('video')){
      fs.unlink(req.file.path, function(){});
      continue;
    }
    (function(curindex){
      var hash;
      var filename;
      var obj;
      var pi = processimage(req.files[i])
      .then(function(processed){
        hash = processed.hash;
        filename = processed.filename;
        obj = processed;
        return images.findByHash(hash)
      })
      .then(function(test){
        console.log(test, hash);
        if(test)//if it already exists just ignore
        {
          return Promise.resolve();
        }
        var image = {
          character: req.body.charactermultiple[curindex],
          emotion: req.body.emotionmultiple[curindex],
          text: req.body.textmultiple[curindex],
          tags: req.body.tagsmultiple[curindex],
          comments: req.body.commentsmultiple[curindex],
          size: req.files[curindex].size,
          mimetype: req.files[curindex].mimetype,
          hash: obj.hash,
          width: obj.width,
          height: obj.height
        };
        return images.add(image)
      });
      inserts.push(pi);
    })(i);
  }
  Promise.all(inserts)
  .then(function(){
    res.redirect('/');
  })
  .catch(function(err){
    console.log(err);
    res.render('imageuploadmultiple', { error: "Some error occured!"});
  })
});




router.get('/uploadurl', function(req, res, next) {
  res.render('imageuploadurl', { title: 'Image URL Upload' });
});



router.post('/uploadurl', function(req, res, next) {
  console.log(req.body);
  if(!req.body.imageurl){
    res.render('imageupload', {error: 'No image file uploaded!'});
    return;
  }

  var original = 'uploads/' + crypto.randomBytes(16).toString('hex');
  var dlstream = request(req.body.imageurl).pipe(fs.createWriteStream(original));
  var mimetype = mime.lookup(req.body.imageurl);
  dlstream.on('finish', function(){

    if(!mimetype.startsWith('image') && !mimetype.startsWith('video')){
      fs.unlink(original, function(){});
      res.render('imageupload', {error: 'File is not an image or video. Type: ' + mimetype});
      return;
    }
    var hash, obj, filesize;
    //dedupe files using MD5
    fs.statAsync(original)
    .then(function(stat){
      filesize = stat.size;
      return processimage({path: original, mimetype: mimetype});
    })
    .then(function(processed){
      hash = processed.hash;
      filename = processed.filename;
      obj = processed;
      return images.findByHash(hash)
    })
    .then(function(test){
      console.log(test, hash);
      if(test)//if it already exists just ignore
      {
        res.render('imageupload', {duplicate: test._id});
        throw 'Duplicate!'
      }
      fs.unlink(original, function(){});

      var image = {
        character: req.body.character,
        emotion: req.body.emotion,
        text: req.body.text,
        tags: req.body.tags,
        comments: req.body.comments,
        size: filesize,
        mimetype: mimetype,
        hash: obj.hash,
        width: obj.width,
        height: obj.height
      };
      return images.add(image)
    })
    .then(function(image){
      res.redirect('/images/' + image._id);
    })
    .catch(function(error){
      console.log(error);
      fs.unlink(original, function(){});
      if(error != 'Duplicate!')res.render('imageupload', {error: 'An error occured'});
    });

  });


});
router.get('/:id', function(req, res, next) {
  images.get(req.params.id)
  .then(function(image){
    res.render('image', image);
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
