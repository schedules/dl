This package provides a dummy browser implementation including MediaSource Extensions, just
sufficient to convince DASH and HLS downloader implementations they are running in a real
browser.

Instead of being played as streamed, the data is written to disc.

It has been tested with [dash.js](https://github.com/Dash-Industry-Forum/dash.js/) and [hls.js](https://github.com/video-dev/hls.js).
