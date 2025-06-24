document.addEventListener('DOMContentLoaded', async () => {
    try {
        const ZoomMtgEmbedded = window?.ZoomMtgEmbedded;
        if (!ZoomMtgEmbedded) {
            console.error("ZoomMtgEmbedded is undefined!");
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

        const sessionId = await getValue('sessionId');
        let sessionInfo;
        console.log("SessionId ", sessionId)
        if (!!sessionId) {
            const sessionStatus = await getSessionStatus(sessionId)
            console.log("Session Status ", sessionStatus)
            if (["AGENT_JOINING", "AGENT_JOINED", "START"].includes(sessionStatus)) {
                sessionInfo = await rejoin(sessionId)
            } else {
                sessionInfo  = await joinMeeting('Luna', 'OA_RES');
                storeValue('sessionId', sessionInfo?.sessionId)
            }
        } else {
            sessionInfo  = await joinMeeting('Luna', 'OA_RES');
            storeValue('sessionId', sessionInfo?.sessionId)
        }
        await client.join(sessionInfo);
    } catch (err) {
        console.error('Zoom widget init error:', err);
    }
});

function createZoomMountPoint() {
    const zoomElement = document.createElement('div');
    zoomElement.className = 'zoom--fixed';

    const container = document.createElement('div');
    container.appendChild(zoomElement);
    container.className = 'spd-zoom';

    document.body.appendChild(container);
    return zoomElement;
}
