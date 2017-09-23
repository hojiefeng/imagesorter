var filesize = require("filesize")
module.exports =  function(tags) {
  if(tags.length)
  {
    tags = tags.split(" ");
    html = ""
    for(tag in tags){
      tag = tags[tag]
      html += "<a href=\"/images/?query=" + tag + "\"class=\"btn btn-info\">" + tag + "</a>"
    }
    return html
  }
  else {
    return ""
  }
}
