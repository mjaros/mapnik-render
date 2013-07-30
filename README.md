# mapnik-render

Simple command line renderer for mapnik written in Node.js.

## Usage

Render a single tile:

    ./mapnik-render.js --output /path/to/output/directory --xml /path/to/mapnik.xml -z 1 -x 1 -y 1

Batch render a bunch of tiles given a maximum zoom level:

    ./mapnik-render.js --output /path/to/output/directory --xml /path/to/mapnik.xml --batchrender --maxzoom 8

## Known issues

When batch rendering after finishing it takes some additional time until the program exists because the map pool is still open.
