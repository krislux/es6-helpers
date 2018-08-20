/**
 * Super simple AJAX Promise helper.
 * 
 * Usage:
 *      ajax('file.json').then(function(xhr) { ... });
 * or
 *      ajax({ url: 'file.json', method: 'post' }).then(function(xhr) { ... });
 * 
 * @return  Promise => XmlHttpRequest
 */
export default function ajax(options) {
    
    if (typeof options === 'string') options = { url: options };

    return new Promise(function(resolve, reject) {

        let xhr = new XMLHttpRequest();

        xhr.addEventListener('readystatechange', function() {
            if (this.readyState === 4) {
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
        xhr.send(options.data || null);
    });
}