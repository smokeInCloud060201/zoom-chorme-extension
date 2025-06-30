/*
  Zoom Kiosk Integration Script

  This script handles Zoom session embedding, initialization, audio/video setup,
  session management, and user interaction tracking inside a kiosk environment.
*/

/**
 * Creates a mount point in the DOM for the embedded Zoom meeting UI.
 * Adds a container div with class 'spd-zoom' containing a child div with class 'zoom--fixed'.
 */
const createZoomMountPoint = () => {
  const zoomElement = document.createElement("div");
  zoomElement.className = "zoom--fixed";

  const container = document.createElement("div");
  container.appendChild(zoomElement);
  container.className = "spd-zoom";

  document.body.appendChild(container);
  return zoomElement;
};

/**
 * Retrieves a value from Chrome's local storage.
 * @param {string} keySet - The key to retrieve from local storage.
 * @returns {Promise<any>} The stored value.
 */
const getValue = (keySet) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([keySet], (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(result[keySet]);
    });
  });
};

/**
 * Sends a message to the Chrome extension runtime.
 * @param {object} message - The message payload.
 * @param {object} options - Options; expectResponse indicates if a response is needed.
 * @returns {Promise<any>|void}
 */
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

/**
 * Observes the DOM for the appearance of the "Leave" button.
 * Attaches click and touch handlers to detect when the meeting is manually ended.
 */
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

/**
 * Automatically clicks the "Join Audio" button when it appears.
 * Recursively calls itself until the button is found.
 */
const enableAudio = () => {
  const audioBtn = document.querySelector('button[title="Audio"]');
  if (!audioBtn) {
    enableAudio();
    return;
  }
  audioBtn.click();
};

/**
 * Automatically clicks the "Start Video" button when it appears.
 * Recursively calls itself until the button is found.
 */
const enableVideo = () => {
  const videoBtn = document.querySelector('button[title="Start Video"]');
  if (!videoBtn) {
    enableVideo();
    return;
  }
  videoBtn.click();
};

// Initialize the Zoom session once DOM content is ready
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const ZoomMtgEmbedded = window?.ZoomMtgEmbedded;
    if (!ZoomMtgEmbedded) {
      console.error("ZoomMtgEmbedded is undefined!");
      return;
    }

    let client = window.zoomClient;

    const { kioskHost, kioskName } = await getValue("kioskConfig");
    window.kioskHost = kioskHost;

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

    client?.on("user-added", (payload) => {
      isAgentJoin = payload?.some(
        (user) => ![kioskName, "VA Kiosk"]?.includes(user?.name)
      );
      if (isAgentJoin) {
        //Todo: Request API to update sessionStatus to AgentJoined
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
