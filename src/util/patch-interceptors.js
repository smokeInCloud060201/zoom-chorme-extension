/*
When Zoom was injected and start the new meeting. It will try to fetch some JS resource
It was blocked by CSP(Content Security Policy)
Use this one to reverse the zoom request from Zoom server to Kiosk server.
Now Kiosk will be like proxy wrapper to forward the request to ZoomServer
**/

const originalCreateElement = document.createElement;

document.createElement = function (tagName, options) {
  const element = originalCreateElement.call(this, tagName, options);

  if (tagName.toLowerCase() === "script") {
    const originalSetAttribute = element.setAttribute;

    element.setAttribute = function (name, value) {
      if (name === "src") {
        handleSrcOverride(this, value, originalSetAttribute);
        return;
      }
      return originalSetAttribute.call(this, name, value);
    };

    Object.defineProperty(element, "src", {
      set(v) {
        handleSrcOverride(element, v, originalSetAttribute);
      },
      get() {
        return element.getAttribute("src");
      },
      configurable: true,
      enumerable: true,
    });
  }

  return element;
};

function handleSrcOverride(element, value, originalSetAttribute) {
  if (value === "https://source.zoom.us/3.10.0/lib/av/js_media.min.js") {
    const localUrl = chrome.runtime.getURL(
      "/zoom/3.10.0/lib/av/js_media.min.js"
    );
    console.log("[Zoom Intercept] Redirecting Zoom SDK to local:", localUrl);
    originalSetAttribute.call(element, "src", localUrl);
    return;
  }

  if (value.startsWith("https://zoom.us/api/v1/wc/info")) {
    const zoomUrl = new URL(value);
    const callbackName = zoomUrl.searchParams.get("callback");

    if (!callbackName) {
      console.warn("[Zoom Intercept] No callback param found in JSONP URL");
      return;
    }

    const proxyUrl = new URL("http://localhost:8080/khaos/v1/zoom-proxy");
    zoomUrl.searchParams.forEach((val, key) => {
      proxyUrl.searchParams.set(key, val);
    });

    console.log(
      "[Zoom Intercept] Fetching data from proxy:",
      proxyUrl.toString()
    );

    fetch(proxyUrl.toString())
      .then((res) => res.text())
      .then((text) => {
        const callbackName = zoomUrl.searchParams.get("callback");

        const match = text.match(/^[^(]+\((.*)\)$/s);
        if (!match) {
          throw new Error("Invalid JSONP format");
        }

        const jsonString = match[1];
        const data = JSON.parse(jsonString);

        if (typeof window[callbackName] === "function") {
          console.log(`[Zoom Intercept] Invoking callback: ${callbackName}`);
          window[callbackName](data);
        } else {
          console.warn(`[Zoom Intercept] Callback ${callbackName} not found`);
        }
      })
      .catch((err) => {
        console.error("[Zoom Intercept] Proxy fetch failed:", err);
      });

    return;
  }
  originalSetAttribute.call(element, "src", value);
}
