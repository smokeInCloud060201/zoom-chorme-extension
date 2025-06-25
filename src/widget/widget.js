const createZoomMountPoint = () => {
  const zoomElement = document.createElement("div");
  zoomElement.className = "zoom--fixed";

  const container = document.createElement("div");
  container.appendChild(zoomElement);
  container.className = "spd-zoom";

  document.body.appendChild(container);
  return zoomElement;
};

const sendMessage = async (message) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(response);
    });
  });
};

const observeLeaveButton = () => {
  const observer = new MutationObserver(() => {
    const leaveButton = document.querySelector('button[title="Leave"]');

    if (leaveButton) {
      let sessionEnded = false;

      leaveButton.addEventListener("click", async () => {
        if (sessionEnded) {
          return;
        }
        sessionEnded = true;

        await sendMessage({ from: "content-script", type: "end-session" });

        window.parent.postMessage(
          {
            source: "kiosk-zoom",
            payload: { type: "end-session" },
          },
          "*"
        );
      });

      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
};

document.addEventListener("DOMContentLoaded", async () => {
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
        language: "en-US",
        zoomAppRoot: createZoomMountPoint(),
        customize: {
          meetingInfo: [
            "topic",
            "host",
            "mn",
            "pwd",
            "telPwd",
            "invite",
            "participant",
            "dc",
            "enctype",
          ],
          video: {
            isResizable: false,
            viewSizes: { default: { width: 250, height: 200 } },
            defaultViewType: "gallery",
          },
        },
        maximumVideosInGalleryView: 2,
      });
      window.zoomClient = client;
    }

    const isSessionValid = await sendMessage({
      from: "content-script",
      type: "check-session-status-valid",
    });
    let sessionInfo;

    if (isSessionValid) {
      sessionInfo = await sendMessage({
        from: "content-script",
        type: "rejoin-session",
      });
    } else {
      sessionInfo = await sendMessage({
        from: "content-script",
        type: "join-session",
      });
    }
    await client.join(sessionInfo);

    observeLeaveButton();
  } catch (err) {
    console.error("Zoom widget init error:", err);
    window.parent.postMessage(
      {
        source: "kiosk-zoom",
        payload: { type: "join-session-fail" },
      },
      "*"
    );
  }
});
