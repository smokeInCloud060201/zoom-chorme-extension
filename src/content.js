// List of host patterns where the Zoom widget is allowed to run
const whitelistPatterns = [
  /myinfo\.gov/i,
  /kiosk.*qa\.spdigital\.sg/i,
  /^kiosk\.spdigital\.sg$/i,
  /^localhost(:\d+)?$/i,
];

/**
 * Sends a message to the service worker.
 * If `expectResponse` is false, it sends without waiting for a reply.
 */
const sendMessageToWorker = async (
  message,
  options = { expectResponse: true }
) => {
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
 * Subscribes to VA feature toggle changes from the backend via SSE.
 * The server will push changes to feature flags in real-time.
 */
const subscribeVAFeatureToggle = async () => {
  const config = await getValue("kioskConfig");
  const host = config?.kioskHost || "https://localhost:test";
  const featureToggleUrl = `${host}/khaos/v1/features`;
  return new EventSource(`${featureToggleUrl}/va`);
};

/**
 * Mounts the Zoom widget or assistance icon based on session state.
 * Also injects a container for toast notifications.
 */
const showExtension = async () => {
  const toastRoot = document.createElement("div");
  toastRoot.id = "toast-container";
  document.body.appendChild(toastRoot);

  try {
    const isSessionValid = await sendMessageToWorker({
      from: "content-script",
      type: "check-session-status-valid",
    });

    if (isSessionValid) {
      mountWidgetIframe();
    } else {
      mountAssistanceIcon();
    }
  } catch (err) {
    console.error("Error contacting service worker:", err);
    mountAssistanceIcon();
  }
};

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

const MAX_RETRIES = 5;
let retryCount = 0;

/**
 * Initializes feature toggle listener using SSE.
 * Attempts exponential backoff if connection fails.
 */
const startFeatureToggleEventSource = async () => {
  try {
    const eventSource = await subscribeVAFeatureToggle();
    const { kioskName } = await getValue("kioskConfig");

    eventSource.addEventListener("data", async (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const kioskFeatureConfig = parsed[kioskName];
        console.log("Received feature toggle data:", kioskFeatureConfig);
        chrome.storage.local.set({ featureFlag: kioskFeatureConfig?.enable });
        if (kioskFeatureConfig?.enable) {
          showExtension();
        } else {
          const isInSession = await getValue("inSession");
          if (isInSession) {
            if (!document.getElementById("kiosk-zoom-widget-iframe")) {
              showExtension();
            }
          } else {
            unmountAssistanceIcon();
            unmountWidgetIframe();
          }
        }
      } catch (err) {
        console.error("Failed to parse feature toggle data", err);
      }
    });

    eventSource.onerror = (err) => {
      console.error("EventSource error", err);
      eventSource.close();

      if (retryCount < MAX_RETRIES) {
        const delay = 1000 * Math.pow(2, retryCount); // exponential backoff
        retryCount++;
        setTimeout(() => {
          console.log(`Retrying EventSource (attempt ${retryCount})...`);
          startFeatureToggleEventSource();
        }, delay);
      } else {
        console.error("Max retries reached. Giving up on EventSource.");
      }
    };
  } catch (err) {
    console.error("Failed to subscribeVAFeatureToggle()", err);

    if (retryCount < MAX_RETRIES) {
      const delay = 1000 * Math.pow(2, retryCount);
      retryCount++;
      setTimeout(() => {
        console.log(`Retrying setup (attempt ${retryCount})...`);
        startFeatureToggleEventSource();
      }, delay);
    } else {
      console.error("Max retries reached in setup. Giving up.");
    }
  }
};

/**
 * Renders the assistance icon. Clicking it triggers the Zoom widget.
 */
const mountAssistanceIcon = () => {
  const icon = document.createElement("img");
  icon.id = "needAssistanceIcon";
  icon.src = chrome.runtime.getURL("icons/assistanceIcon.svg");
  icon.onclick = () => {
    icon.style.transform = "translateY(100px)";
    icon.style.opacity = "0";

    mountWidgetIframe();
  };

  icon.style = `
      position: fixed; bottom: 50px; left: 50px; width: 80px; height: 80px;
      z-index: 9999; cursor: pointer; visibility: visible; padding: 20px;
      background-color: #fff; border-radius: 50%; box-shadow: 5px 5px 5px 5px #aaaaaa;
      transition: transform 0.3s ease, opacity 0.3s ease;
    `;
  document.body.appendChild(icon);
};

/**
 * Loads the Zoom widget in an iframe.
 * Unmounts the assistance icon once shown.
 */
const mountWidgetIframe = () => {
  const iframe = document.createElement("iframe");
  iframe.id = "kiosk-zoom-widget-iframe";
  iframe.src = chrome.runtime.getURL("widget.html");
  iframe.className = "kiosk-zoom-widget-iframe";
  document.body.appendChild(iframe);
  requestAnimationFrame(() => {
    iframe.style.transform = "translateX(0)";
    iframe.style.opacity = "1";
  });

  unmountAssistanceIcon();
};

/**
 * Creates a toast notification element.
 */
const createToast = ({ message, duration = null, iconType = "non" }) => {
  const container = document.getElementById("toast-container");

  const toast = document.createElement("div");
  toast.className = "toast";

  // Icon
  if (iconType !== "none") {
    const icon = document.createElement("div");
    icon.className = "toast-icon";
    if (iconType === "dot") {
      icon.classList.add("icon-dot");
      toast.classList.add("dot");
    } else if (iconType === "spinner") {
      icon.classList.add("icon-spinner");
      toast.classList.add("spinner");
    }
    toast.appendChild(icon);
  }

  const msg = document.createElement("div");
  msg.textContent = message;
  toast.appendChild(msg);

  container.appendChild(toast);

  if (typeof duration === "number" && duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }

  return toast;
};

const removeToast = (toastEl) => {
  toastEl.style.animation = "fadeOut 0.3s forwards";
  setTimeout(() => toastEl.remove(), 300);
};

const removeToastByClassName = (name) => {
  const toast = document.querySelector(`.toast.${name}`);
  if (toast) {
    removeToast(toast);
  }
};

const unmountWidgetIframe = () => {
  const iframe = document.getElementById("kiosk-zoom-widget-iframe");
  if (iframe) {
    iframe.style.transform = "translateX(100px)";
    iframe.style.opacity = "0";
    iframe.remove();
  }
};

const unmountAssistanceIcon = () => {
  const icon = document.getElementById("needAssistanceIcon");

  if (icon) {
    icon.remove();
  }
};

(async () => {
  const currentHost = window.location.host;

  const isWhitelisted = whitelistPatterns.some((pattern) =>
    pattern.test(currentHost)
  );

  if (isWhitelisted) {
    startFeatureToggleEventSource();
  }
})();

/**
 * Handles postMessage events sent from Zoom widget iframe.
 * Used for communication between iframe and content script.
 */
window.addEventListener("message", async (event) => {
  const source = event.data?.source;
  if (source === "kiosk-zoom") {
    const type = event?.data?.payload?.type;
    const data = event?.data?.payload?.data;

    switch (type) {
      case "enable-kiosk-zoom-extension": {
        const { accessToken, kioskName, featureFlag, kioskHost } = data;

        const kioskConfig = {
          accessToken,
          kioskName,
          featureFlag,
          kioskHost,
        };

        chrome.storage.local.set({ kioskConfig });

        break;
      }
      case "end-session":
      case "join-session-fail": {
        unmountWidgetIframe();
        removeToastByClassName("dot");
        removeToastByClassName("spinner");

        const featureFlag = await getValue("featureFlag");

        if (featureFlag) {
          mountAssistanceIcon();
        } else {
          unmountAssistanceIcon();
        }
        break;
      }

      case "add-toast": {
        createToast({
          duration: data?.duration,
          iconType: data?.iconType,
          message: data?.message,
        });
        break;
      }

      case "remove-toast": {
        removeToastByClassName(data?.name);
        break;
      }

      default: {
        console.log("No valid message type");
        break;
      }
    }
  }
});

/**
 * Handles messages from background (service worker).
 * Used to show real-time events like agent joining or queue status.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.from === "worker") {
    const type = message?.type;
    const payload = message?.payload;

    switch (type) {
      case "agent-joined-toast": {
        removeToastByClassName("dot");
        removeToastByClassName("spinner");
        createToast({
          message: `Agent ${payload} has joined !!!`,
          duration: 5000,
        });
        return false;
      }
      case "count-call-in-queue": {
        createToast({
          message: payload?.message,
          iconType: payload?.iconType,
        });
        return false;
      }

      default: {
        console.log("No valid message type");
        return false;
      }
    }
  }
});
