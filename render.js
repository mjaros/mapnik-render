#!/usr/bin/env node

var mapnik = require('mapnik');
var fs = require('fs');
var os = require('os');
var SphericalMercator = require('sphericalmercator');
var pool = require('generic-pool');
var mkdirp = require('mkdirp');
var RenderQueue = require('./render_queue');

// Command line argument parsing
var argv = require('optimist')
  .demand(['output'])
  .boolean(['batchrender'])
  .default({xml: 'test/fixtures/sample.xml', batchrender: false, maxzoom: 0, z: 0, x: 0, y: 0})
  .argv;

var mercator = new SphericalMercator({size: 256});

// Load default system fonts
mapnik.register_default_fonts();

// Load map pool
var mapPool = pool.Pool({
  create: function(callback) {
    var map = new mapnik.Map(256, 256);
    map.load(argv.xml, function(err, map) {
      if (err) return callback(err, null);
      else callback(null, map);
    });
  },
  destroy: function(map) {
    delete map;
  },
  max: os.cpus().length,
});

// Create render queue
var queue = new RenderQueue(renderTile, os.cpus().length);

// Signal handling
process.on('SIGINT', function() {
  console.log('Received SIGINT. Shutting down ...');
  shutdown();
});
process.on('SIGTERM', function() {
  console.log('Received SIGTERM. Shutting down ...');
  shutdown();
});

function shutdown() {
  mapPool.drain(function() {
    mapPool.destroyAllNow();
  });
}

function renderTile(z, x, y, outputdir, callback) {
  var z = z;
  var x = x;
  var y = y;
  var image = new mapnik.Image(256, 256);
  var bbox = mercator.bbox(x, y, z, false, '900913');

  mapPool.acquire(function(err, map) {
    if (err) {
      mapPool.release(map);
      return callback(err, null);
    }
    map.extent = bbox;
    map.render(image, function(err, image) {
      if (err) {
        mapPool.release(map);
        return callback(err, null);
      }
      image.encode('png', function(err, buffer) {
        process.nextTick(function() {
          mapPool.release(map);
        });
        if (err) return callback(err, null);
        mkdirp.sync(outputdir + '/' + z + '/' + x);
        fs.writeFile(outputdir + '/' + z + '/' + x + '/' + y + '.png', buffer, function(err) {
          if (err) return callback(err, null);
          callback(null, null);
        });
      });
    });
  });
}

function preRenderTiles(maxZoom, outputdir) {
  for (var z = 0; z <= maxZoom; z++) {
    var length = Math.pow(2, z);
    for (var x = 0; x < length; x++) {
      for (var y = 0; y < length; y++) {
        var key = z + ',' + x + ',' + y + ',' + outputdir;
        queue.add(key);
      }
    }
  }
}

if (argv.batchrender) {
  preRenderTiles(argv.maxzoom, argv.output);
}
else {
  renderTile(argv.z, argv.x, argv.y, argv.output, function(err) {
    if (err) console.error(err);
    else {
      shutdown();
    }
  });
}
