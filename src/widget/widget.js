/**
 * Zoom Kiosk Integration Script
 *
 * Embeds Zoom meetings in a kiosk environment,
 * handles UI mounting, session management, audio/video setup,
 * and interaction reporting.
 */

const createZoomMountPoint = () => {
  const zoomEl = document.createElement("div");
  zoomEl.className = "zoom--fixed";

  const container = document.createElement("div");
  container.className = "spd-zoom";
  container.appendChild(zoomEl);

  document.body.appendChild(container);
  return zoomEl;
};

const getValue = (key) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      chrome.runtime.lastError
        ? reject(chrome.runtime.lastError)
        : resolve(result[key]);
    });
  });
};

const sendMessage = async (message, { expectResponse = true } = {}) => {
  if (!expectResponse) return chrome.runtime.sendMessage(message);
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      chrome.runtime.lastError
        ? reject(chrome.runtime.lastError)
        : resolve(response);
    });
  });
};

const observeLeaveButton = () => {
  const observer = new MutationObserver(() => {
    const leaveBtn = document.querySelector('button[title="Leave"]');
    if (!leaveBtn) return;

    let sessionEnded = false;

    const handleLeave = async () => {
      if (sessionEnded) return;
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

    leaveBtn.addEventListener("click", handleLeave);
    leaveBtn.addEventListener("touchstart", handleLeave);
    observer.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });
};

const clickWhenAvailable = (selector) => {
  const tryClick = () => {
    const btn = document.querySelector(selector);
    if (btn) btn.click();
    else requestAnimationFrame(tryClick);
  };
  tryClick();
};

const enableAudio = () => clickWhenAvailable('button[title="Audio"]');
const enableVideo = () => clickWhenAvailable('button[title="Start Video"]');

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const ZoomMtgEmbedded = window?.ZoomMtgEmbedded;
    if (!ZoomMtgEmbedded) {
      console.error("ZoomMtgEmbedded is undefined!");
      return;
    }

    const { kioskHost, kioskName } = await getValue("kioskConfig");
    window.kioskHost = kioskHost;

    let client = window.zoomClient || ZoomMtgEmbedded.createClient();

    if (!window.zoomClient) {
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
      // Notify queue wait
      window.parent.postMessage(
        {
          source: "kiosk-zoom",
          payload: {
            type: "add-toast",
            data: { message: "Call", iconType: "spinner" },
          },
        },
        "*"
      );

      sessionInfo = await sendMessage({ from: "widget", type: "join-session" });

      sendMessage(
        { from: "widget", type: "subscribe-agent-joined" },
        { expectResponse: false }
      );
    }

    await client.join(sessionInfo);

    client.on("connection-change", ({ state }) => {
      if (["Closed", "Failed"].includes(state)) {
        window.parent.postMessage(
          {
            source: "kiosk-zoom",
            payload: { type: "end-session" },
          },
          "*"
        );

        sendMessage(
          { from: "widget", type: "end-session" },
          { expectResponse: false }
        );
      }
    });

    client.on("user-added", (users) => {
      const isAgentJoin = users.some(
        (user) => !["VA Kiosk", kioskName].includes(user?.name)
      );
      if (isAgentJoin) {
        // TODO: Call API to mark session as "AgentJoined"
      }
    });

    if (!isSessionValid) {
      window.parent.postMessage(
        {
          source: "kiosk-zoom",
          payload: { type: "remove-toast", data: { name: "spinner" } },
        },
        "*"
      );

      sendMessage(
        { from: "widget", type: "count-call-in-queue" },
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
    enableAudio();
    enableVideo();
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
      { from: "widget", type: "join-session-fail" },
      { expectResponse: false }
    );
  }
});
