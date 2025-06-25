import {
  changeStatus,
  getSessionStatus,
  joinMeeting,
  rejoin,
} from "./widget/widget.service";
import { getValue, removeValue, storeValue } from "./util/utils";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.from === "content-script") {
    const type = message?.type;

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
      case "end-session": {
        (async () => {
          const sessionId = await getValue("sessionId");
          await changeStatus(sessionId, "END");
          removeValue("sessionId");
          sendResponse({ status: "ok" });
        })();

        return true;
      }
      default: {
        console.log("Not valid type");
        sendResponse({ status: "unrecognized" });
        return false;
      }
    }
  }
});
