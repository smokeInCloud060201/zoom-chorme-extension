const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const fetchee = await originalFetch(...args);
    return new Proxy(fetchee, {});
};

// new Proxy(target, {
//     get: (target, prop, receiver) => {
//         let ret = target[prop];
//         if (typeof ret === "function") ret = ret.bind(target);
//         return ret;
//     }
// });



/////// XHR ///////

function hookXMLHttpRequest({
                                DEBUG,
                                window,
                                quickFilter,
                                onInterceptionError,
                                onRequestSeen,
                                onResponseSeen,
                            }) {
    const OriginalXMLHttpRequest = window.XMLHttpRequest;

    // note: normally takes no params, except for a Mozilla non-standard extension
    // http://devdocs.io/dom/xmlhttprequest/xmlhttprequest
    window.XMLHttpRequest = function XMLHttpRequest(mozParam) {
        const request = new OriginalXMLHttpRequest(mozParam);

        try {
            let method = null;
            let url = null;
            let body = null;

            // intercept open() to grab method + url
            const originalOpen = request.open;
            request.open = function open() {
                try {
                    method = (arguments[0] || 'GET').toUpperCase();
                    url = (arguments[1] || '').toLowerCase();
                } catch (e) {
                    onInterceptionError('intercepting XMLHttpRequest open()', e);
                }

                return originalOpen.apply(request, arguments);
            };

            // intercept send() to grab the optional body
            const originalSend = request.send;
            request.send = function send() {
                try {
                    if (quickFilter(method, url)) {
                        body = arguments[0];
                        if (typeof body === 'string' && body[0] === '{') {
                            try {
                                body = JSON.parse(body);
                            } catch (e) {
                                if (DEBUG)
                                    console.warn(
                                        ` error parsing XHR request body`,
                                        e,
                                        {
                                            method,
                                            url,
                                            body,
                                        },
                                    );
                                // swallow
                            }
                        }

                        onRequestSeen({
                            api: 'XMLHttpRequest',
                            method,
                            url,
                            body,
                        });
                    }
                } catch (e) {
                    onInterceptionError('intercepting XMLHttpRequest send()', e);
                }

                return originalSend.apply(request, arguments);
            };

            // listen to request end
            request.addEventListener('load', () => {
                try {
                    if (quickFilter(method, url)) {
                        let { response } = request;
                        if (typeof response === 'string' && response[0] === '{') {
                            try {
                                response = JSON.parse(response);
                            } catch (e) {
                                if (DEBUG)
                                    console.warn(
                                        ` error parsing XHR response`,
                                        e,
                                        {
                                            method,
                                            url,
                                            response,
                                        },
                                    );
                                // swallow
                            }
                        }

                        onResponseSeen({
                            api: 'XMLHttpRequest',
                            method,
                            url,
                            body,
                            status: request.status,
                            response,
                        });
                    }
                } catch (e) {
                    onInterceptionError('processing XMLHttpRequest load evt', e);
                }
            });

            if (DEBUG)
                request.addEventListener('error', () =>
                    console.error(` error`, { method, url }, request),
                );
            if (DEBUG)
                request.addEventListener('abort', () =>
                    console.error(` abort`, { method, url }, request),
                );
        } catch (e) {
            onInterceptionError('intercepting XMLHttpRequest', e);
        }

        return request;
    };

    return OriginalXMLHttpRequest;
}

function hookFetch({
                       DEBUG,
                       window,
                       quickFilter,
                       onInterceptionError,
                       onRequestSeen,
                       onResponseSeen,
                   }) {
    const originalFetch = window.fetch;

    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
    window.fetch = function fetch(input, init) {
        const promisedResponse = originalFetch.apply(window, arguments);

        try {
            const method = ((init ? init.method : null) || 'GET').toUpperCase();
            const url = (typeof input === 'string' ? input : '').toLowerCase();
            const body = init ? init.body : null;

            if (quickFilter(method, url)) {
                onRequestSeen({
                    api: 'fetch',
                    method,
                    url,
                    body,
                });

                promisedResponse
                    .then(response => response.clone()) // important to avoid "body already read"
                    .then(response =>
                        response
                            .json()
                            .catch(() => response.text())
                            .catch(() => null)
                            .then(res => {
                                onResponseSeen({
                                    api: 'fetch',
                                    method,
                                    url,
                                    body,
                                    response: res,
                                });
                            }),
                    )
                    .catch(onInterceptionError.bind(null, 'reading fetch() response'));
            }
        } catch (e) {
            onInterceptionError('intercepting fetch()', e);
        }

        return promisedResponse;
    };

    return originalFetch;
}

function setUpXHRInterceptor({
                                                DEBUG = true,
                                                window,
                                                quickFilter = (/* method, url */) => true,
                                            } = {}) {
    // //////////////////////////////////

    function onInterceptionError(debugId, e) {
        console.error(` error while ${debugId}`, e);
    }

    const requestWaiters = [];

    function onXHRRequest(callback) {
        requestWaiters.push(callback);
    }

    const responsesWaiters = [];

    function onXHRResponse(callback) {
        responsesWaiters.push(callback);
    }

    function onRequestSeen({api, method, url, body} = {}) {
        try {
            if (!quickFilter(method, url)) return;
            if (DEBUG) console.info(` onRequestSeen`, {api, method, url, body});
            requestWaiters.forEach(callback => callback({method, url, body}));
        } catch (e) {
            onInterceptionError('onRequestSeen', e);
            /* swallow */
        }
    }

    function onResponseSeen({api, method, url, body, status, response} = {}) {
        try {
            if (!quickFilter(method, url)) return;
            if (DEBUG)
                console.info(` onResponseSeen`, {
                    api,
                    method,
                    url,
                    body,
                    status,
                    response,
                });
            responsesWaiters.forEach(callback => callback({method, url, body, status, response}));
        } catch (e) {
            onInterceptionError('onResponseSeen', e);
            /* swallow */
        }
    }

    // //////////////////////////////////

    const OriginalXMLHttpRequest = hookXMLHttpRequest({
        window,
        DEBUG,
        quickFilter,
        onInterceptionError,
        onRequestSeen,
        onResponseSeen,
    });

    const originalFetch = hookFetch({
        window,
        DEBUG,
        quickFilter,
        onInterceptionError,
        onRequestSeen,
        onResponseSeen,
    });

}