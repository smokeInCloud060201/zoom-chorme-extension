const sendMessageToWorker = async (message) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(response);
    });
  });
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

  icon.style = `
      position: fixed; bottom: 50px; left: 50px; width: 80px; height: 80px;
      z-index: 9999; cursor: pointer; visibility: visible; padding: 20px;
      background-color: #fff; border-radius: 50%; box-shadow: 5px 5px 5px 5px #aaaaaa;
      transition: transform 0.3s ease, opacity 0.3s ease;
    `;
  document.body.appendChild(icon);
};

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

(async function () {
  if (document.getElementById("my-widget-iframe")) {
    return;
  }

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
})();

// Message listener for storing token
window.addEventListener("message", (event) => {
  if (event.data?.source === "kiosk-zoom") {
    switch (event?.data?.payload?.type) {
      case "GET_ACCESS_TOKEN": {
        const token = event?.data?.payload?.data;
        chrome.storage.local.set({ accessToken: token }, () => {
          console.log('Value is set with key "accessToken", value:', token);
        });
        break;
      }
      case "end-session":
      case "join-session-fail":
        unmountWidgetIframe();
        mountAssistanceIcon();
        break;

      default:
        console.log("No valid message type");
        break;
    }
  }
});
