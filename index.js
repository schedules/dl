var util = require('util');
var URL = require('url');
var fs = require('fs');
var XMLHttpRequest = global.XMLHttpRequest = require("xhr2");

const EventEmitter = require('events');
class HTMLVideoElement extends EventEmitter {}
global.HTMLVideoElement = HTMLVideoElement;

var Hls = require('./hls.js');

const INITIAL_SIZE = 512000;

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
		console.log('yelp addEventListener: '+eventName);
		this.addListener(eventName,callback);
		this.readyState = 'open';
		if (eventName == 'sourceopen') {
			console.log('Fired: '+eventName);
			this.emit(eventName);
		}
	}
	removeEventListener(eventName,blah) {
		console.log('yelp removeEventListener: '+eventName);
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

const dummyElement = new HTMLVideoElement();

var msArray = [];

global.window = {};
global.window.URL = global.URL = URL;
global.window.URL.createObjectURL = function(url) {
	console.log('yelp coURL '+util.inspect(url));
};
global.window.URL.revokeObjectURL = function(url) {
	console.log('yelp roURL '+util.inspect(url));
};
global.window.location = {};
global.window.location.href = 'http://there.not/';
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
global.window.performance = global.performance = {};
global.window.performance.now = function() {return new Date();};
global.window.setTimeout = setTimeout;
global.window.clearTimeout = clearTimeout;
global.navigator = {};
global.navigator.userAgent = 'like Chrome';
global.self = {};
global.self.console = console;

var player;

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


//----------------------------------------------------------------------------------
function downloadDash(url) {
	require('./dash.all.debug.js');
	global.dashjs = window.dashjs;
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
}

//----------------------------------------------------------------------------------
function downloadHls(url) {
	dummyElement.addTextTrack = function(tt){
		console.log('** Adding textTrack '+util.inspect(tt));
		return {};
	};
	dummyElement.textTracks = {};
	dummyElement.textTracks.addEventListener = function(e,cb) {
		console.log('** Adding eventListener: '+e);	
	};
	var hls = new Hls({debug:true});
	console.log('Support sufficient: '+Hls.isSupported());
	hls.on(Hls.Events.MEDIA_ATTACHED, function () {
		console.log("video and hls.js are now bound together !");
    	//hls.loadSource('http://www.streambox.fr/playlists/test_001/stream.m3u8');
    	hls.loadSource(url);
	});
    hls.on(Hls.Events.MANIFEST_PARSED,function() {
      //video.play();
	  dummyElement.emit('play');
	});
    hls.attachMedia(dummyElement);
}

//----------------------------------------------------------------------------------

var url = process.argv.length > 2 ? process.argv[2] : "http://dash.edgesuite.net/envivio/EnvivioDash3/manifest.mpd";

if (url.indexOf('.mpd')>0) {
	downloadDash(url);
}
else {
	downloadHls(url)
}

process.on('exit',function(){
	console.log(util.inspect(msArray));
});
