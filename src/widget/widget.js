document.getElementById("increBtn").onclick = async () => {
    const { default: ZoomMtgEmbedded } = await import("@zoom/meetingsdk/embedded");

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

    const sessionInfo = await joinMeeting('Luna', 'OA_RES');

    console.log("SessionInfo ", sessionInfo);

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
