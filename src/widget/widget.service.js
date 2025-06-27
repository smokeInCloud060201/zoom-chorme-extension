import { getValue } from "../util/utils";

const getBaseHost = async () => {
  const config = await getValue("kioskConfig");
  console.log(" config is ", config, config?.kioskHost);
  return config?.kioskHost || "https://localhost:test";
};

const getBaseHalpUrl = async () => {
  const host = await getBaseHost();
  return `${host}/khaos/v1/halp`;
};

const getBaseSessionUrl = async () => {
  const host = await getBaseHost();
  return `${host}/khaos/v1/sessions`;
};

export const getAuthHeader = async () => {
  const { accessToken } = await getValue("kioskConfig");
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

// Halp
export const getAvailableAgents = async () => {
  const baseHalpUrl = await getBaseHalpUrl();
  const res = await fetch(`${baseHalpUrl}/agents`);
  if (!res.ok) throw new Error("Failed to fetch agents");
  return res.json();
};

export const getSchedulesByDate = async (currentDate) => {
  const baseHalpUrl = await getBaseHalpUrl();
  const url = new URL(`${baseHalpUrl}/available-schedules`);
  url.searchParams.append("date", currentDate);

  const res = await fetch(url.toString());
  return res.json();
};

export const countCallInQueue = async () => {
  const baseHalpUrl = await getBaseHalpUrl();
  const res = await fetch(`${baseHalpUrl}/sessions/count-queued`, {
    method: "GET",
    headers: await getAuthHeader(),
  });
  return res.json();
};

export const subscribeAgentJoinedEvent = async (sessionId) => {
  const baseHalpUrl = await getBaseHalpUrl();
  return new EventSource(
    `${baseHalpUrl}/sessions/agent-joined?sessionId=${sessionId}`
  );
};

//Session
export const joinMeeting = async (kioskName, nature) => {
  const baseSessionUrl = await getBaseSessionUrl();
  const url = new URL(baseSessionUrl);
  url.searchParams.append("kioskName", kioskName);
  url.searchParams.append("nature", nature);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: await getAuthHeader(),
  });
  return res.json();
};

export const rejoin = async (sessionId) => {
  const baseSessionUrl = await getBaseSessionUrl();
  const res = await fetch(`${baseSessionUrl}/${sessionId}/rejoin`, {
    method: "POST",
    headers: await getAuthHeader(),
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
};

export const getSessionStatus = async (sessionId) => {
  const baseSessionUrl = await getBaseSessionUrl();
  const res = await fetch(`${baseSessionUrl}/${sessionId}/status`, {
    method: "GET",
    headers: await getAuthHeader(),
  });

  if (!res.ok) {
    return "ERROR";
  }

  return res.json();
};

export const changeStatus = async (sessionId, status) => {
  const baseSessionUrl = await getBaseSessionUrl();
  const url = new URL(`${baseSessionUrl}/${sessionId}`);
  url.searchParams.append("status", status);

  await fetch(url.toString(), {
    method: "POST",
    headers: await getAuthHeader(),
  });
};
