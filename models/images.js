
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
mongoose.connect('mongodb://localhost/images');
var imageSchema = mongoose.Schema({
    file: String,
    mimetype: String,
    size: Number,
    width: Number,
    height: Number,
    hash: String,
    character: String,
    emotion: String,
    text: String,
    tags: String,
    comments: String,
    udpated: { type: Date, default: Date.now },
    created: { type: Date, default: Date.now },
});

imageSchema.index({ character: 'text', emotion: 'text', text: 'text', tags: 'text', comment: 'text' });

var Image = mongoose.model('images', imageSchema);
var images = {};
_ = require('lodash');
/*Image.find({}).lean().exec(function(err, images){
  var size = images.length;
  for(var i = 0;i<size;i++)
  {
    var dupimage = images[i];
    dupimage = _.omit(dupimage, '_id');
    var newimage = new Image(dupimage);

    newimage.save();
  }

});*/

   //Image.remove({ "character" : { "$exists" : false } }).exec();
images.add = function(image) {
  var newimages = new Image(image);
  return newimages.save()
}
images.findByHash = function(hash){
  return Image.findOne({hash: hash}).exec();
}
images.get = function(id){
  return Image.findById(id).exec();
}
images.delete = function(id){
  return Image.deleteOne({_id: id}).exec();
}
images.update = function(id, updatedinfo){
  return Image.updateOne({_id: id}, {$set: updatedinfo}).exec();
}
images.count = function(){
  return Image.count({}).exec();
}
//sorts by time
images.getRange = function(from, items, query) {
  if(query)
    return Image.find({$text: {$search: query}}).skip(from).limit(items).exec();
  else
    return Image.find().sort({created: -1}).skip(from).limit(items).exec();
}
module.exports = images
