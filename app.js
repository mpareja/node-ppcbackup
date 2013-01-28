var fs = require('fs');
var map = require('map-stream');
var split = require('split');
var through = require('through');

var rs = fs.createReadStream('data/contacts_20121230.csc');
rs.setEncoding('utf16le');

var lineNumber = 0;
var startAtLine = process.argv[2] || 0;
var filter = process.argv[3] ? new RegExp(process.argv[3]) : null;
var first = true;

if (startAtLine > 1) {
//  console.log('Starting at line: ' + startAtLine);
} else {
  startAtLine = 0;
}

var rowStream = rs.pipe(split(/\r?\n/)).pipe(map(function (line, callback) {
  lineNumber++;
  // skip header
  if (lineNumber < startAtLine) {
    return callback();
  } else if (filter && !filter.test(line)) {
    return callback();
  }

  var fields = line.split(';').map(function (field) {
    return field.substring(1, field.length - 1);
  });
  callback(null, fields);
}));

var counts = {};
rowStream.pipe(map(function (fields, callback) {
  for (var i = 0; i < fields.length; i++) {
    if (/0x[0-9a-bA-Z][0-9a-bA-Z]/.test(fields[i])) {
      counts[i] = counts[i] ? counts[i] + 1 : 1;
    }
  }
}));

var noimage = rowStream.pipe(map(function (fields, callback) {
  fields.splice(59, 1);
  callback(null, fields);
}));

var unicoded = noimage.pipe(map(function (fields, callback) {
  // find encoded unicode fields and decode them
  var f = fields.slice(0); // clone it
  for (var i = 0; i < fields.length; i++) {
    if (/0x[0-9a-bA-Z][0-9a-bA-Z]/.test(f[i])) {
      var octects = breakIntoOctects(f[i]);
      var buffer = new Buffer(octects)
      f[i] = buffer.toString('utf16le');
    }
  }
  callback(null, f);
}));

function breakIntoOctects(csv) {
  return csv.split(',').map(function (s) {
    return parseInt(s, 16);
  });
}

var csved = unicoded.pipe(map(function (fields, callback) {
  var s = fields.map(function (f) {
    return f.indexOf(',') >= 0 ? '"' + f.replace('"', '\\"') + '"' : f;
  }).join(',');
  callback(null, s);
}));


csved.pipe(process.stdout);

//csved.on('data', function (data) {
//  var octects = breakIntoOctects(data[data.length - 4]);
//  console.log(data[data.length - 4]);
//
//  fs.writeFile('image.png', new Buffer(octects), function (err) {
//    if (err) { console.log("ERROR: " + err); }
//    console.log('File written.');
//  });
//});

var linesplit = csved.pipe(map(function (s, callback) {
  callback(null, s + '\r\n');
}));
linesplit.pipe(fs.createWriteStream('data/output1.csv'));

csved.on('end', function (data) {
//  console.log(counts);
});

process.stdout.on('error', function (err) {
  process.stderr.write("ERROR: " + err.message);
});


