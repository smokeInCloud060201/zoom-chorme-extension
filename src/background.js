import {
  changeStatus,
  countCallInQueue,
  getSessionStatus,
  joinMeeting,
  rejoin,
  subscribeAgentJoinedEvent,
} from "./widget/widget.service";
import { getValue, removeValue, storeValue } from "./util/utils";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (["widget", "content-script"].includes(message?.from)) {
    const type = message?.type;
    let eventSource;
    switch (type) {
      case "check-session-status-valid": {
        (async () => {
          const { sessionId } = await chrome.storage.local.get("sessionId");
          let isSessionValid = false;

          if (sessionId) {
            const sessionStatus = await getSessionStatus(sessionId);
            if (
              ["AGENT_JOINING", "AGENT_JOINED", "START"].includes(sessionStatus)
            ) {
              isSessionValid = true;
            }
          }
          sendResponse(isSessionValid);
        })();

        return true;
      }
      case "join-session": {
        (async () => {
          const sessionInfo = await joinMeeting("Luna", "OA_RES");
          sendResponse(sessionInfo);
          storeValue("sessionId", sessionInfo?.sessionId);
        })();

        return true;
      }
      case "rejoin-session": {
        (async () => {
          const sessionId = await getValue("sessionId");
          const sessionInfo = await rejoin(sessionId);
          sendResponse(sessionInfo);
        })();

        return true;
      }
      case "end-session":
      case "join-session-fail": {
        if (eventSource) {
          eventSource?.close();
        }
        (async () => {
          const sessionId = await getValue("sessionId");
          await changeStatus(sessionId, "END");
          removeValue("sessionId");
          removeValue("inSession");
        })();

        return false;
      }
      case "count-call-in-queue": {
        (async () => {
          const queueCount = await countCallInQueue();
          chrome.tabs.query({}, (tabs) => {
            for (const tab of tabs) {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, {
                  from: "worker",
                  type: "count-call-in-queue",
                  payload: {
                    message: `${queueCount} call in queue`,
                    iconType: "dot",
                  },
                });
              }
            }
          });
        })();

        return false;
      }
      case "subscribe-agent-joined": {
        (async () => {
          const sessionId = await getValue("sessionId");
          eventSource = await subscribeAgentJoinedEvent(sessionId);
          eventSource.onmessage = (message) => {
            const data = JSON.parse(message.data);
            if (!data) {
              return true;
            }
            chrome.tabs.query({}, (tabs) => {
              for (const tab of tabs) {
                if (tab.id) {
                  chrome.tabs.sendMessage(tab.id, {
                    from: "worker",
                    type: "agent-joined-toast",
                    payload: data?.agentName,
                  });
                }
              }
            });
          };
          eventSource.onerror = () => {
            eventSource.close();
          };
        })();
        return false;
      }
      default: {
        console.log("Not valid type");
        return false;
      }
    }
  }
});
