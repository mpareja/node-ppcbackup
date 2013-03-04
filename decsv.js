var decsv = require('decsv');
var fs = require('fs');
var map = require('map-stream');
var split = require('split');

module.exports = function (filename, startAtLine, filter) {
  var binaryRegex = /^(0x[0-9a-fA-F][0-9a-fA-F],?)+$/;
  var rs = fs.createReadStream(filename);
  rs.setEncoding('utf16le');

  var filteredRows = (function () {
    var lineIndex = 0;
    var startIndex = startAtLine - 1;
    if (startIndex > 0) {
      process.stderr.write('Starting at line: ' + startAtLine + '\n');
    } else {
      startIndex = 0;
    }

    return rs.pipe(decsv(';')).pipe(map(function (fields, callback) {
      if (lineIndex++ < startIndex) {
        return callback();
      } else if (filter && !fields.some(filter.test.bind(filter))) {
        return callback();
      }
      callback(null, fields);
    }));
  }());

  var counts = {};
  filteredRows.on('data', function (fields) {
    for (var i = 0; i < fields.length; i++) {
      if (binaryRegex.test(fields[i])) {
        counts[i] = counts[i] ? counts[i] + 1 : 1;
      }
    }
  });

  var unicoded = filteredRows.pipe(map(function (fields, callback) {
    // find encoded unicode fields and decode them
    var f = fields.slice(0); // clone it
    for (var i = 0; i < fields.length; i++) {
      if (binaryRegex.test(f[i])) {
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

