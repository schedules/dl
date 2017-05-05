var util = require('util');
var fetch = require('node-fetch');
var XMLHttpRequest = global.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var x2j = require('jgexml/xml2json.js');

global.window = {};
global.window.dashjs = {}; // odd but there you go
global.window.MediaSource = {};
global.window.addEventListener = function(event,listener) {};
global.document = {};
global.document.readyState = 'complete';
global.document.querySelectorAll = function(x){return[]};
global.window.document = global.document;
global.window.DOMParser = require('xmldom').DOMParser; 
global.window.performance = {};
global.window.performance.now = function() {return new Date();};
global.navigator = {};
global.navigator.userAgent = 'like Chrome';

const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}

const dummyElement = new MyEmitter();
dummyElement.on('canplay', () => {
  console.log('an event occurred!');
});
dummyElement.addEventListener = dummyElement.addListener;

dummyElement.pause = function(p,a) {
	console.log('Paused: '+util.inspect(p)+' '+util.inspect(a));
	dummyElement.emit('pause');
	dummyElement.emit('play');
	dummyElement.emit('playing');
	return false;
};
dummyElement.preload = 'auto';

dummyElement.addListener('play',function(p){
	console.log('Saw the play event');
	console.log(util.inspect(dummyElement));
});

//require('./dash.all.min.js');
require('./dash.all.debug.js');
global.dashjs = window.dashjs;

console.log(util.inspect(dashjs));
var url = "http://dash.edgesuite.net/envivio/EnvivioDash3/manifest.mpd";
var mp = dashjs.MediaPlayer();
console.log(util.inspect(mp));
var player = mp.create();

var override = {};
override.displayCaptionsOnTop = function(bool) {};
//var extended = player.extend('nip',override,true);
//console.log(util.inspect(extended));

var debug = player.getDebug();
console.log(util.inspect(debug));
debug.setLogToBrowserConsole(true);
debug.setLogTimestampVisible(true);
debug.log('Testing debug logging');

console.log('About to call init');
player.initialize(dummyElement, url, true); // does an attachSource, last param is autoplay

console.log('About to call play');
for (let i=0;i<5;i++) {
	player.seek(i);
}
player.setAutoPlay(true);
player.play();
console.log(util.inspect(player));

dummyElement.emit('loadedmetadata');
dummyElement.emit('canplay');
dummyElement.emit('canplaythrough');
dummyElement.emit('progress');
dummyElement.emit('ended');
console.log('dummyElement: '+util.inspect(dummyElement));

//player.retrieveManifest(url,function(a,b){
	//console.log('Callback called');
	//if (a) console.log('a:'+util.inspect(a));
	//if (b) console.log('b:'+util.inspect(b));
//});
