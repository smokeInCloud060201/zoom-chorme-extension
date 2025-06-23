const originalXHROpen = XMLHttpRequest.prototype.open;

XMLHttpRequest.prototype.open = function (method, url) {
    if (url && url.includes('js_media.min.js')) {
        const localUrl = chrome.runtime.getURL('dist/zoom/3.13.1/lib/av/js_media.min.js');
        console.log('[Zoom Patch] Redirecting XHR to local js_media:', localUrl);
        arguments[1] = localUrl;
    }
    return originalXHROpen.apply(this, arguments);
};

document.getElementById("increBtn").onclick = async () => {
    const ZoomMtgEmbedded = window?.ZoomMtgEmbedded;
    if (!ZoomMtgEmbedded) {
        console.error("ZoomMtgEmbedded is still undefined!");
        return;
    }

    let client = window.zoomClient;
    if (!client) {
        client = ZoomMtgEmbedded.createClient();
        await client.init({
            debug: true,
            language: 'en-US',
            zoomAppRoot: createZoomMountPoint(),
            customize: {
                meetingInfo: ['topic', 'host', 'mn', 'pwd', 'invite'],
                video: {
                    isResizable: false,
                    viewSizes: { default: { width: 250, height: 200 } }
                }
            },
            maximumVideosInGalleryView: 2,
        });
        window.zoomClient = client;
    }

    console.log("ZoomClient", client);

    const sessionInfo = await joinMeeting('Luna', 'OA_RES')

    console.log("SessionInfo ", sessionInfo)

    await client.join(sessionInfo)
};

function createZoomMountPoint() {
    const zoomElement = document.createElement('div');
    zoomElement.className = 'zoom--fixed';

    const container = document.createElement('div');
    container.appendChild(zoomElement);
    container.className = 'spd-zoom';

    document.body.appendChild(container);
    return zoomElement;
}