var fs = require('fs');
var map = require('map-stream');
var split = require('split');

module.exports = function (filename, startAtLine, filter) {
  var rs = fs.createReadStream(filename);
  rs.setEncoding('utf16le');
  var lineNumber = 0;

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
  rowStream.on('data', function (fields) {
    for (var i = 0; i < fields.length; i++) {
      if (/0x[0-9a-bA-Z][0-9a-bA-Z]/.test(fields[i])) {
        counts[i] = counts[i] ? counts[i] + 1 : 1;
      }
    }
  });

  var unicoded = rowStream.pipe(map(function (fields, callback) {
    // find encoded unicode fields and decode them
    var f = fields.slice(0); // clone it
    for (var i = 0; i < fields.length; i++) {
      if (/0x[0-9a-bA-Z][0-9a-bA-Z],0x[0-9a-bA-Z][0-9a-bA-Z]/.test(f[i])) {
        var octects = breakIntoOctects(f[i]);
        var buffer = new Buffer(octects)
        f[i] = buffer.toString('utf16le');
      }
    }
    callback(null, f);
  }));

  unicoded.on('end', function () {
    unicoded.emit('counts', counts);
  });

  function breakIntoOctects(csv) {
    return csv.split(',').map(function (s) {
      return parseInt(s, 16);
    });
  }

  return unicoded;
};

