const createZoomMountPoint = () => {
  const zoomElement = document.createElement("div");
  zoomElement.className = "zoom--fixed";

  const container = document.createElement("div");
  container.appendChild(zoomElement);
  container.className = "spd-zoom";

  document.body.appendChild(container);
  return zoomElement;
};

const sendMessage = async (message, options = { expectResponse: true }) => {
  if (!options.expectResponse) {
    chrome.runtime.sendMessage(message);
    return;
  }
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

      const onClickLeaveButton = async () => {
        if (sessionEnded) {
          return;
        }
        sessionEnded = true;

        sendMessage(
          { from: "widget", type: "end-session" },
          { expectResponse: false }
        );

        window.parent.postMessage(
          {
            source: "kiosk-zoom",
            payload: { type: "end-session" },
          },
          "*"
        );
      };

      leaveButton.addEventListener("click", onClickLeaveButton);
      leaveButton.addEventListener("touchstart", onClickLeaveButton);

      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
};

const enableAudio = () => {
  const audioBtn = document.querySelector('button[title="Audio"]');
  if (!audioBtn) {
    enableAudio();
    return;
  }
  audioBtn.click();
};

const enableVideo = () => {
  const videoBtn = document.querySelector('button[title="Start Video"]');
  if (!videoBtn) {
    enableVideo();
    return;
  }
  videoBtn.click();
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const ZoomMtgEmbedded = window?.ZoomMtgEmbedded;
    if (!ZoomMtgEmbedded) {
      console.error("ZoomMtgEmbedded is undefined!");
      return;
    }

    let client = window.zoomClient;

    chrome.storage.local.get("kioskConfig", ({ kioskConfig }) => {
      window.kioskHost = kioskConfig?.kioskHost;
    });

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

    chrome.storage.local.set({ inSession: true });

    const isSessionValid = await sendMessage({
      from: "widget",
      type: "check-session-status-valid",
    });
    let sessionInfo;

    if (isSessionValid) {
      sessionInfo = await sendMessage({
        from: "widget",
        type: "rejoin-session",
      });
    } else {
      window.parent.postMessage(
        {
          source: "kiosk-zoom",
          payload: {
            type: "add-toast",
            data: {
              message: `Call`,
              iconType: "spinner",
            },
          },
        },
        "*"
      );
      sessionInfo = await sendMessage({
        from: "widget",
        type: "join-session",
      });
      sendMessage(
        {
          from: "widget",
          type: "subscribe-agent-joined",
        },
        { expectResponse: false }
      );
    }
    await client.join(sessionInfo);

    client?.on("connection-change", ({ state }) => {
      if (state === "Closed" || state === "Failed") {
        window.parent.postMessage(
          {
            source: "kiosk-zoom",
            payload: { type: "end-session" },
          },
          "*"
        );

        sendMessage(
          {
            from: "widget",
            type: "end-session",
          },
          { expectResponse: false }
        );
      }
    });

    if (isSessionValid) {
    } else {
      window.parent.postMessage(
        {
          source: "kiosk-zoom",
          payload: {
            type: "remove-toast",
            data: {
              name: "spinner",
            },
          },
        },
        "*"
      );
      sendMessage(
        {
          from: "widget",
          type: "count-call-in-queue",
        },
        { expectResponse: false }
      );
      window.parent.postMessage(
        {
          source: "kiosk-zoom",
          payload: {
            type: "add-toast",
            data: {
              message: "Waiting for agent to take the call...",
              iconType: "spinner",
            },
          },
        },
        "*"
      );
    }

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

    sendMessage(
      {
        from: "widget",
        type: "join-session-fail",
      },
      { expectResponse: false }
    );
  }
});
