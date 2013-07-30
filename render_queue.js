var util = require('util');
var EventEmitter = require('events').EventEmitter;

function RenderQueue(callback, concurrency) {
  this.render = callback;
  this.queue = [];
  this.concurrency = concurrency || 5;
  this.running = 0;
}

util.inherits(RenderQueue, EventEmitter);

RenderQueue.prototype.add = function(key) {
  this.queue.push(key);
  if (this.running < this.concurrency) this.next();
}

RenderQueue.prototype.next = function() {
  if (this.queue.length) this.invoke();
  else this.emit('drain');
}

RenderQueue.prototype.invoke = function() {
  if (this.queue.length && this.running < this.concurrency) {
    this.running++;
    var opts = this.queue.shift().split(',');
    var z = opts[0];
    var x = opts[1];
    var y = opts[2];
    var outputdir = opts[3];
    var _this = this;
    this.render(z, x, y, outputdir, function(err) {
      if (err) console.error(err);
      _this.running--;
      _this.next();
    });
  }
}

module.exports = RenderQueue;
