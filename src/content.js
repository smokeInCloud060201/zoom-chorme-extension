const MAX_RETRIES = 5;
const whitelistPatterns = [
  /myinfo\.gov/i,
  /kiosk.*qa\.spdigital\.sg/i,
  /^kiosk\.spdigital\.sg$/i,
  /^localhost(:\d+)?$/i,
];

const getValue = (key) =>
  new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      chrome.runtime.lastError
        ? reject(chrome.runtime.lastError)
        : resolve(result[key]);
    });
  });

const sendMessageToWorker = async (message, { expectResponse = true } = {}) => {
  if (!expectResponse) return chrome.runtime.sendMessage(message);

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      chrome.runtime.lastError
        ? reject(chrome.runtime.lastError)
        : resolve(response);
    });
  });
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const createToast = ({ message, duration = null, iconType = "none" }) => {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${iconType}`;

  if (iconType !== "none") {
    const icon = document.createElement("div");
    icon.className = `toast-icon icon-${iconType}`;
    toast.appendChild(icon);
  }

  const msg = document.createElement("div");
  msg.textContent = message;
  toast.appendChild(msg);
  container.appendChild(toast);

  if (duration > 0) setTimeout(() => removeToast(toast), duration);
  return toast;
};

const removeToast = (el) => {
  el.style.animation = "fadeOut 0.3s forwards";
  setTimeout(() => el.remove(), 300);
};

const removeToastByClassName = (name) => {
  const toast = document.querySelector(`.toast.${name}`);
  if (toast) removeToast(toast);
};

const mountAssistanceIcon = () => {
  const icon = document.createElement("img");
  icon.id = "needAssistanceIcon";
  icon.src = chrome.runtime.getURL("icons/assistanceIcon.svg");
  icon.onclick = () => {
    icon.style.transform = "translateY(100px)";
    icon.style.opacity = "0";
    mountWidgetIframe();
  };

  Object.assign(icon.style, {
    position: "fixed",
    bottom: "50px",
    left: "50px",
    width: "80px",
    height: "80px",
    zIndex: "9999",
    cursor: "pointer",
    visibility: "visible",
    padding: "20px",
    backgroundColor: "#fff",
    borderRadius: "50%",
    boxShadow: "5px 5px 5px 5px #aaaaaa",
    transition: "transform 0.3s ease, opacity 0.3s ease",
  });

  document.body.appendChild(icon);
};

const mountWidgetIframe = () => {
  if (document.getElementById("kiosk-zoom-widget-iframe")) return;

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

const unmountWidgetIframe = () => {
  const iframe = document.getElementById("kiosk-zoom-widget-iframe");
  if (iframe) iframe.remove();
};

const unmountAssistanceIcon = () => {
  document.getElementById("needAssistanceIcon")?.remove();
};

const showExtension = async () => {
  const toastRoot = document.createElement("div");
  toastRoot.id = "toast-container";
  document.body.appendChild(toastRoot);

  try {
    const isSessionValid = await sendMessageToWorker({
      from: "content-script",
      type: "check-session-status-valid",
    });

    isSessionValid ? mountWidgetIframe() : mountAssistanceIcon();
  } catch (err) {
    console.error("Error contacting service worker:", err);
    mountAssistanceIcon();
  }
};

const subscribeVAFeatureToggle = async () => {
  const config = await getValue("kioskConfig");
  const host = config?.kioskHost || "https://localhost:test";
  return new EventSource(`${host}/khaos/v1/features/va`);
};

let retryCount = 0;

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
          const inSession = await getValue("inSession");
          if (
            inSession &&
            !document.getElementById("kiosk-zoom-widget-iframe")
          ) {
            showExtension();
          } else {
            unmountWidgetIframe();
            unmountAssistanceIcon();
          }
        }
      } catch (err) {
        console.error("Invalid feature toggle data", err);
      }
    });

    eventSource.onerror = async (err) => {
      console.error("EventSource error", err);
      eventSource.close();

      if (retryCount < MAX_RETRIES) {
        await delay(1000 * 2 ** retryCount++);
        console.log(`Retrying EventSource (attempt ${retryCount})...`);
        startFeatureToggleEventSource();
      } else {
        console.error("Max retries reached. Giving up on EventSource.");
      }
    };
  } catch (err) {
    console.error("Failed to subscribe to VA Feature Toggle", err);
    if (retryCount < MAX_RETRIES) {
      await delay(1000 * 2 ** retryCount++);
      console.log(`Retrying setup (attempt ${retryCount})...`);
      startFeatureToggleEventSource();
    } else {
      console.error("Max retries reached in setup. Giving up.");
    }
  }
};

window.addEventListener("message", async (event) => {
  const { source, payload } = event.data || {};
  if (source !== "kiosk-zoom") return;

  switch (payload?.type) {
    case "enable-kiosk-zoom-extension":
      chrome.storage.local.set({ kioskConfig: payload.data });
      break;

    case "end-session":
    case "join-session-fail":
      unmountWidgetIframe();
      removeToastByClassName("dot");
      removeToastByClassName("spinner");

      const featureFlag = await getValue("featureFlag");
      featureFlag ? mountAssistanceIcon() : unmountAssistanceIcon();
      break;

    case "add-toast":
      createToast(payload.data);
      break;

    case "remove-toast":
      removeToastByClassName(payload.data?.name);
      break;

    default:
      console.log("Unknown message type from iframe");
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.from !== "worker") return;

  switch (message.type) {
    case "agent-joined-toast":
      removeToastByClassName("dot");
      removeToastByClassName("spinner");
      createToast({
        message: `Agent ${message.payload} has joined !!!`,
        duration: 5000,
      });
      break;

    case "count-call-in-queue":
      createToast({
        message: message.payload?.message,
        iconType: message.payload?.iconType,
      });
      break;

    default:
      console.log("Unknown message type from service worker");
  }
});

(async () => {
  const currentHost = window.location.host;
  if (whitelistPatterns.some((pattern) => pattern.test(currentHost))) {
    startFeatureToggleEventSource();
  }
})();
