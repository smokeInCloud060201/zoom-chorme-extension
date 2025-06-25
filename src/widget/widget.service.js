// const BASE_HOST = 'https://khaos-api-sit-run-2.tkg-qa.spdigital.io'
import { getValue } from "../util/utils";

const BASE_HOST = "http://localhost:8080";

const BASE_HALP_URL = `${BASE_HOST}/khaos/v1/halp`;

export async function getAvailableAgents() {
  const res = await fetch(`${BASE_HALP_URL}/agents`);
  if (!res.ok) throw new Error("Failed to fetch agents");
  return res.json();
}

export async function getSchedulesByDate(currentDate) {
  const url = new URL(`${BASE_HALP_URL}/available-schedules`);
  url.searchParams.append("date", currentDate);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch schedules");
  return res.json();
}

export async function countCallInQueue() {
  const res = await fetch(`${BASE_HALP_URL}/sessions/count-queued`);
  if (!res.ok) throw new Error("Failed to fetch queue count");
  return res.json();
}

function subscribeAgentJoinedEvent(sessionId) {
  return new EventSource(
    `${BASE_HALP_URL}/sessions/agent-joined?sessionId=${sessionId}`
  );
}

const BASE_SESSION_URL = `${BASE_HOST}/khaos/v1/sessions`;

export async function getAuthHeader() {
  const token = await getValue("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function joinMeeting(kioskName, nature) {
  const url = new URL(BASE_SESSION_URL);
  url.searchParams.append("kioskName", kioskName);
  url.searchParams.append("nature", nature);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: await getAuthHeader(),
  });
  return res.json();
}

export async function rejoin(sessionId) {
  const res = await fetch(`${BASE_SESSION_URL}/${sessionId}/rejoin`, {
    method: "POST",
    headers: await getAuthHeader(),
  });

  if (!res.ok) {
    // sessionStorage.removeItem(storageKey.kioskSession.key);
    return null;
  }

  return res.json();
}

export async function getSessionStatus(sessionId) {
  const res = await fetch(`${BASE_SESSION_URL}/${sessionId}/status`, {
    method: "GET",
    headers: await getAuthHeader(),
  });

  if (!res.ok) {
    return "ERROR";
  }

  return res.json();
}

export async function changeStatus(sessionId, status) {
  const url = new URL(`${BASE_SESSION_URL}/${sessionId}`);
  url.searchParams.append("status", status);

  await fetch(url.toString(), {
    method: "POST",
    headers: await getAuthHeader(),
  });
}

export async function updateTxnNature(request) {
  const res = await fetch(`${BASE_SESSION_URL}/transactionNature`, {
    method: "POST",
    headers: {
      ...getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error("Failed to update transaction nature");
  }
}
