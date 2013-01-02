var EventEmitter = require('events').EventEmitter;
var fs = require('fs');

var rs = fs.createReadStream('test.csv');
rs.setEncoding('ascii');

var lineEmitter = (function (rs) {
  var instance = new EventEmitter();
  instance.line = function (line) {
    if (line) {
      this.emit('line', line);
    }
  };

  var partial;
  rs.on('data', function (data) {
    var lines = data.split('\r\n');
    partial = lines.pop();
    lines.forEach(function (line) {
      instance.line(line);
    });
  });
  rs.on('error', function(err) { instance.emit('error', err); });
  rs.on('end', function(err) {
    if (partial !== null) {
      instance.line(partial);
    }
    instance.emit('end');
  });
  return instance;
}(rs));


lineEmitter.on('line', function (line) { console.log('DATA: ' + line); });
lineEmitter.on('error', console.error);
lineEmitter.on('end', function () {
  console.log('done.');
  process.exit();
});


