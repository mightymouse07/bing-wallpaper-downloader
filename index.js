var fs = require('fs');
var path = require('path');
var request = require('request');
var querystring = require('querystring');
var nconf = require('nconf');

nconf.argv().env().file({ file: './config.json' });

var today = new Date();
today.setHours(0,0,0,0);

nconf.defaults({
    lastDownload: today.getTime() - (1000*3600*24*10) // Default to ten days ago (download 10 images to start)
});

var getImagePaths = function(options, callback) {

    request.get(options).on('response', function(response) {
        var jsonString = '';
        response.on('data', function(data) {
            jsonString += data;
        });

        response.on('end', () => {
            //console.log(`DATA ${jsonString}`)
            var data = JSON.parse(jsonString);
            console.log(`Received ${data.images.length} image links.`);
            for (var imgNum = 0; imgNum < data.images.length; imgNum++) {
                var path = data.images[imgNum].url;
                var filename = path.substring(path.lastIndexOf('/') + 1, path.length);
                download('https://www.bing.com' + data.images[imgNum].url, filename, function(image) {
                    console.log('downlaoded ' + image);
                });
            }
        });
    });
}

var download = function(uri, filename, callback) {
    console.log(`Download: ${uri}`);
    request.head(uri, function(err, res, body) {
        request.get(uri).pipe(fs.createWriteStream(path.join(process.argv[2], filename)));
    });
}

/**
 * MAIN
 */

var queryParams = {
    format: 'js',
    idx: 0,
    n: 1,
    mkt: 'en-US'
};

if (process.argv[2] === undefined) {
    console.log('Usage: node index.js [path to save downloads to]\n');
    process.exit(0);
}

// Calculate number of days since last download so we know
// how many images to request.
var timeDiff = Math.abs(today.getTime() - nconf.get('lastDownload'));
var imageCount = Math.floor(timeDiff / (1000 * 3600 * 24)); 
if (imageCount === 0) {
    console.log('Images are up to date.');
    process.exit(0);
}
queryParams.n = imageCount;
console.log(`Requesting ${imageCount} images.`);

// Download the images
var options = {
    uri: 'https://www.bing.com/HPImageArchive.aspx?' + querystring.stringify(queryParams),
    port: 80,
    json: true
};

console.log(`URI: ${options.uri}`);

getImagePaths(options, function() {
    console.log('Done.');
});

// Save the configuration file
nconf.set('lastDownload', today.getTime());
nconf.save();

