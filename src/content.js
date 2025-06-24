import './widget/widget.css';

const getSessionStatus = async (sessionId) => {
    const { accessToken } = await chrome.storage.local.get('accessToken');

    console.log("Access Token ", accessToken)

    const res = await fetch(`http://localhost:8080/khaos/v1/sessions/${sessionId}/status`, {
        method: "GET",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    });

    if (!res.ok) {
        return "ERROR";
    }

    return res.json();
};

(async function () {
    if (document.getElementById('my-widget-iframe')) return;

    const { sessionId } = await chrome.storage.local.get('sessionId');
    console.log("sessionID ", sessionId);

    let isRejoin = false;

    if (sessionId) {
        const sessionStatus = await getSessionStatus(sessionId);
        if (["AGENT_JOINING", "AGENT_JOINED", "START"].includes(sessionStatus)) {
            isRejoin = true;
        }
    }

    if (isRejoin) {
        const iframe = document.createElement('iframe');
        iframe.id = 'my-widget-iframe';
        iframe.src = chrome.runtime.getURL('widget.html');
        iframe.className = 'my-widget-iframe';
        document.body.appendChild(iframe);
        requestAnimationFrame(() => {
            iframe.style.transform = 'translateX(0)';
            iframe.style.opacity = '1';
        });
    } else {
        const icon = document.createElement("img");
        icon.id = 'needAssistanceIcon';
        icon.src = chrome.runtime.getURL("icons/assistanceIcon.svg");
        icon.onclick = () => {
            icon.style.transform = 'translateY(100px)';
            icon.style.opacity = '0';

            const iframe = document.createElement('iframe');
            iframe.id = 'my-widget-iframe';
            iframe.src = chrome.runtime.getURL('widget.html');
            iframe.className = 'my-widget-iframe';
            document.body.appendChild(iframe);
            requestAnimationFrame(() => {
                iframe.style.transform = 'translateX(0)';
                iframe.style.opacity = '1';
            });
        };

        icon.style = `
      position: fixed; bottom: 50px; left: 50px; width: 80px; height: 80px;
      z-index: 9999; cursor: pointer; visibility: visible; padding: 20px;
      background-color: #fff; border-radius: 50%; box-shadow: 5px 5px 5px 5px #aaaaaa;
      transition: transform 0.3s ease, opacity 0.3s ease;
    `;
        document.body.appendChild(icon);
    }
})();

// Message listener for storing token
window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.source === "kiosk-zoom") {
        console.log("Event ", event);

        switch (event?.data?.payload?.type) {
            case "GET_ACCESS_TOKEN": {
                const token = event?.data?.payload?.data;
                chrome.storage.local.set({ accessToken: token }, () => {
                    console.log('Value is set with key "accessToken", value:', token);
                });
                break;
            }
            default:
                console.log("No valid message type");
                break;
        }
    }
});
