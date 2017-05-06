var util = require('util');
var URL = require('url');
var fs = require('fs');
var XMLHttpRequest = global.XMLHttpRequest = require("xhr2");

const INITIAL_SIZE = 512000;

const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}

class SourceBuffer extends EventEmitter {
	constructor(mimetype) {
		super();
		this._mimetype = mimetype;
		this._buffer = Buffer.alloc(INITIAL_SIZE,0,'binary');
		return this;
	}
	appendBuffer(data) {
		console.log(this._mimetype+' '+data.length+' '+typeof data);
		if (data.length > INITIAL_SIZE) {
			throw new Error('Buffer size exceeded');
		}
		var that = this;
		if (this._mimetype.startsWith('audio')) {
			fs.appendFile('./audio.ts.m4a',new Buffer(data,'binary'),'binary',function(){
				that.emit('onupdateend');
			});
		}
		else if (this._mimetype.startsWith('video')) {
			fs.appendFile('./video.ts.mp4',new Buffer(data,'binary'),'binary',function(){
				that.emit('onupdateend');
			});
		}
		else if (this._mimetype.startsWith('text')) {
			fs.appendFile('./text.sub',data,'binary',function(){
				that.emit('onupdateend');
			});
		}
		else {
			console.log('Unhandled mimetype '+this._mimetype);
		}
	}
	get buffered() {
		return [];
	}
	get mode() {
		return '';//'sequence';
	}
}

class MyMediaSource extends EventEmitter {
	constructor() {
		super();
		this.readyState = 'closed';
		this._sb = {};
		return this;
	}
	get sourceBuffers() {	
		var a = [];
		for (let sb in this._sb) {
			a.push(this._sb[sb]);
		}
		return a;
	}
	addEventListener(eventName,callback) {
		this.addListener(eventName,callback);
		this.readyState = 'open';
		this.emit('sourceopen');
	}
	removeEventListener(eventName,blah) {
		console.log('yelp removeEventListener');
		console.log(util.inspect(eventName));
		console.log(util.inspect(blah));
	}
	addSourceBuffer(mimetype) {
		console.log('yelp new buffer for '+mimetype);
		var nb = new SourceBuffer(mimetype);
		this._sb[mimetype] = nb;
		return nb;
	}
	endOfStream(error) {
		console.log('** End of stream: '+error);
		dummyElement.emit('ended');
	}
}

try { fs.unlinkSync('./video.ts.mp4'); } catch (ex) {}
try { fs.unlinkSync('./audio.ts.m4a'); } catch (ex) {}
try { fs.unlinkSync('./text.sub'); } catch (ex) {}

const dummyElement = new MyEmitter();

var msArray = [];

global.window = {};
global.window.URL = URL;
global.window.URL.createObjectURL = function(url) {
	console.log('yelp coURL '+url);
};
global.window.URL.revokeObjectURL = function(url) {
	console.log('yelp roURL '+url);
};
global.window.dashjs = {}; // odd but there you go
global.window.MediaSource = global.MediaSource = function(){
	var ms = new MyMediaSource();
	msArray.push(ms);
	return ms;
};
global.MediaSource.isTypeSupported = function(codec){return true};

global.window.addEventListener = function(event,listener) {console.log('Wanted window event')};
global.document = {};
global.document.readyState = 'complete';
global.document.querySelectorAll = function(x){return[dummyElement]};
global.window.document = global.document;
global.window.DOMParser = require('xmldom').DOMParser; 
global.window.performance = {};
global.window.performance.now = function() {return new Date();};
global.navigator = {};
global.navigator.userAgent = 'like Chrome';

var player;

//dummyElement.on('canplay', () => {
//  console.log('an event occurred!');
//});
dummyElement.addEventListener = dummyElement.addListener;

dummyElement.pause = function() {
	console.log('Paused');
	dummyElement.emit('pause');
	dummyElement.emit('play');
	return false;
};
dummyElement.preload = 'auto';
dummyElement.buffered = {};
dummyElement.height = 1080;
dummyElement.width = 1920;
dummyElement.loop = false;
dummyElement.played = {};
dummyElement.removeAttribute = function(attr){};
dummyElement.load = function(l){console.log('**:'+util.inspect(this))};
dummyElement.canPlayType = function(codec){console.log('Got asked about:'+codec);return 'probably'};
dummyElement.nodeName = 'video';
dummyElement.playbackQuality = {};
dummyElement.getVideoPlaybackQuality = function() {return dummyElement.playbackQuality};

require('./dash.all.debug.js');
global.dashjs = window.dashjs;

console.log(util.inspect(dashjs));
var url = process.argv.length > 2 ? process.argv[2] : "http://dash.edgesuite.net/envivio/EnvivioDash3/manifest.mpd";
var mp = dashjs.MediaPlayer();
player = mp.create();

	player.on('manifestUpdated',function(m){
		console.log('* Got manifestUpdated');
		console.log(util.inspect(m));
	},'dasher');
	player.on('metricAdded',function(m){
		//console.log('* Got metricadded');
		//console.log(util.inspect(m));
	},'dasher');
	player.on('loadedMetadata',function(m){
		console.log('* Got loadedmetadata');
		console.log(util.inspect(m));
		dummyElement.emit('loadedmetadata');
	},'dasher');
	player.on('playbackStarted',function(e){
		console.log('Got a playbackStarted event');
		console.log(util.inspect(e));
		//console.log(util.inspect(dummyElement));
		//dummyElement.emit('play'); // calling play here seems to continue the playback?
		dummyElement.emit('playing');
		dummyElement.emit('canplay');
		dummyElement.emit('progress');
	},'dasher');
	player.on('log',function(l){
		//console.log(l);
	},'dasher');
	player.on('playbackEnded',function(){
		//dummyElement.emit('ended'); // makes playback loop?
	},'dasher');
	player.on('streamTeardownComplete',function(e){
		console.log(util.inspect(e));
		dummyElement.emit('ended');
	},'dasher');

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
player.initialize(dummyElement, url, false); // does an attachSource, last param is autoplay

console.log(util.inspect(player));
console.log('About to call seek');
player.setCurrentTrack(0);
dummyElement.emit('seeking');
player.seek(0);
//for (let i=0;i<60;i++) {
//	player.seek(i);
//}
//player.setCurrentTrack(0);
//player.setAutoPlay(true);
//player.play();

//dummyElement.emit('loadedmetadata');
//dummyElement.emit('canplay');
//dummyElement.emit('canplaythrough');
//dummyElement.emit('progress');
//dummyElement.emit('ended');
//console.log('dummyElement: '+util.inspect(dummyElement));

//player.retrieveManifest(url,function(a,b){
	//console.log('Callback called');
	//if (a) console.log('a:'+util.inspect(a));
	//if (b) console.log('b:'+util.inspect(b));
//});

process.on('exit',function(){
	console.log(util.inspect(msArray));
});
