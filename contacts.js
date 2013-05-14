var decsv = require('./decsv');
var fs = require('fs');
var lingo = require('lingo');
var map = require('map-stream');

var startAtLine = process.argv[2] || 0;
var filter = process.argv[3] ? new RegExp(process.argv[3]) : null;

var stream = decsv('data/contacts_filtered.csv', startAtLine, filter);
var noimage = stream.pipe(map(function (fields, callback) {
  for (var i = 0; i < 13; i++) {
    // Capitalize peoples names
    if (fields[i]) {
      fields[i] = lingo.capitalize(fields[i].toLocaleLowerCase(), true);
    }
  }
  // remove Display Name field
  fields.splice(7, 1);
  // remove the notes image field
  fields.splice(59 - 1, 1);
  callback(null, fields);
}));

var csved = noimage.pipe(map(function (fields, callback) {
  var chars = [','];
  var s = fields.map(function (f) {
    var needsQuote = chars.some(function (c) { return f.indexOf(c); })
    return needsQuote ? '"' + f.replace('"', '\\"') + '"' : f;
  }).join(',');
  callback(null, s + '\r\n');
}));
csved.pipe(fs.createWriteStream('data/output1.csv'));
//csved.pipe(process.stdout);

// stream.on('counts', function (counts) { console.log(counts); });

process.stdout.on('error', function (err) {
  process.stderr.write("ERROR: " + err.message);
});

//stream.on('data', function (data) {
//  var octects = breakIntoOctects(data[data.length - 4]);
//  console.log(data[data.length - 4]);
//
//  fs.writeFile('image.png', new Buffer(octects), function (err) {
//    if (err) { console.log("ERROR: " + err); }
//    console.log('File written.');
//  });
//});

