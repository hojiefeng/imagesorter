
var mongoose = require('./mongodb');
var imageSchema = mongoose.Schema({
    mimetype: String,
    size: Number,
    width: Number,
    height: Number,
    hash: { type: String, index: true },
    character: String,
    emotion: String,
    text: String,
    tags: String,
    comments: String,
    updated: { type: Date, default: Date.now, index: true },
    created: { type: Date, default: Date.now, index: true },
});

imageSchema.index({ character: 'text', emotion: 'text', text: 'text', tags: 'text', comments: 'text' });

var Image = mongoose.model('images', imageSchema);
var images = {};
_ = require('lodash');

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
    return Image.find({$text: {$search: query}}, { score: { $meta: "textScore" } }).sort( { score: { $meta: "textScore" } } ).skip(from).limit(items).exec();
  else
    return Image.find().sort({created: -1}).skip(from).limit(items).exec();
}

images.getCount = function(query){
  if(query)
    return Image.count({$text: {$search: query}}).exec();
  else return this.count();
}


images.getRandom = function(query){
  if(query)
    return Image.aggregate( [{$match: { $text: {$search: query}}}, { $sample: { size: 1 } }]).exec()
  else return Image.aggregate( { $sample: { size: 1 } }).exec()
}


module.exports = images
