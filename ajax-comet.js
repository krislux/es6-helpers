/**
 * Super simple AJAX Promise helper.
 * Now with Comet support.
 * 
 * Does not support Internet Explorer at all, as it doesn't support Promises.
 * This can be fixed with a Promise polyfill.
 * Support: Edge 12+, Firefox 29+, Chrome 33+, Safari 7.1+, Android 4.4.4+, iOS Safari 8+.
 * 
 * Usage:
 *      ajax('file.json').then(xhr => { ... });
 * or
 *      ajax({ url: 'file.json', method: 'post' }).then(xhr => { ... });
 * 
 * @param   {(object|string)}   options               // If string this is the url, if object see below.
 * @param   {string}   [options.method]               // HTTP method to use, defaults to GET.
 * @param   {string}   [options.url]                  // Any valid url to call.
 * @param   {(object|FormData|string)} [options.data] // Body data for POST etc.
 * @param   {object}   [options.headers]              // Custom headers in {name:value} format.
 * @param   {string}   [options.contentType]          // Shorthand for Content-Type header.
 * @param   {boolean}  [options.async]                // Defaults to true, pass false to block execution.
 * @param   {string}   [options.user]                 // Authentication username.
 * @param   {string}   [options.password]             // Authentication password.
 * @param   {function} [options.comet]                // Pass a callback to enable Comet mode. Callback takes a single arg, value.
 * @param   {number}   [options.cometPollRate]        // Milliseconds between checking stream for new data. Defaults to 100.
 * 
 * @return  {Promise}  Arg is XmlHttpRequest with added properties responseJSON (if JSON) and responseComet (if Comet).
 */
/*!
 * @author  Kris Lux <mail@kilolima.dk>
 * @version 1.1
 * @license MIT
 */
export default function ajax(options) {
    
    if (typeof options === 'string') options = { url: options };
    
    // Only used in Comet mode. Length is the buffer length of the progress data before final flush.
    let cometTimer = null, cometLength = 0;

    return new Promise(function(resolve, reject) {

        let xhr = new XMLHttpRequest();

        xhr.addEventListener('readystatechange', function() {
            if (this.readyState === 4) {
                // In Comet mode, add extra property for cleaned data without progress.
                if (cometTimer) {
                    clearInterval(cometTimer);
                    this.responseComet = this.responseText.substr(cometLength);
                }
                
                if (this.status >= 200 && this.status <= 299) {
                    if (this.getResponseHeader('Content-Type') == 'application/json') {
                        this.responseJSON = JSON.parse(this.response);
                    }
                    resolve(this);
                }
                else {
                    reject(Error(this.statusText));
                }
            }
        });

        xhr.open(
            (options.method  || 'GET').toUpperCase(),
            options.url,
            options.async    || true,
            options.user     || null,
            options.password || null,
        );
        
        /**
         * Set headers, including shorthand for setting the Content-Type header.
         */
        if (typeof options.headers === 'undefined') options.headers = {};
        if (options.contentType) {
            options.headers['Content-Type'] = options.contentType;
        }
        Object.keys(options.headers || {}).forEach(key => {
            xhr.setRequestHeader(key, options.headers[key]);
        });

        /**
         * If Content-Type is set to JSON, stringify data objects.
         */
        if (typeof options.data == 'object' && options.headers['Content-Type'] == 'application/json') {
            options.data = JSON.stringify(options.data);
        }

        /**
         * Convert data objects (except FormData) to &url=param strings.
         * Currently this only works for single dimension objects.
         */
        else if (typeof options.data == 'object' && !(options.data instanceof FormData)) {
            options.data = Object.entries(options.data).map(([key, value]) => {
                return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            }).join('&');
        }

        /**
         * If comet callback set in options, use comet mode to read data continuously.
         */
        if (options.comet && options.comet.constructor === Function) {
            let lastLine = null;
            cometTimer = setInterval(() => {
                cometLength = xhr.responseText.length;
                let lines = xhr.responseText.split(/[\n\r]+/);
                let line = lines[lines.length-2];
                if (line && line !== lastLine)
                    options.comet(line);
                lastLine = line;
            }, options.cometPollRate || 100);
        }

        xhr.send(options.data || null);
    });
}