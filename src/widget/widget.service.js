// const BASE_HOST = 'https://khaos-api-sit-run-2.tkg-qa.spdigital.io'
const BASE_HOST = 'http://localhost:8080'

const BASE_HALP_URL = `${BASE_HOST}/khaos/v1/halp`;

async function getAvailableAgents() {
    const res = await fetch(`${BASE_HALP_URL}/agents`);
    if (!res.ok) throw new Error("Failed to fetch agents");
    return res.json();
}

async function getSchedulesByDate(currentDate) {
    const url = new URL(`${BASE_HALP_URL}/available-schedules`);
    url.searchParams.append("date", currentDate);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Failed to fetch schedules");
    return res.json();
}

async function countCallInQueue() {
    const res = await fetch(`${BASE_HALP_URL}/sessions/count-queued`);
    if (!res.ok) throw new Error("Failed to fetch queue count");
    return res.json();
}

function subscribeAgentJoinedEvent(sessionId) {
    return new EventSource(`${BASE_HALP_URL}/sessions/agent-joined?sessionId=${sessionId}`);
}

const BASE_SESSION_URL = `${BASE_HOST}/khaos/v1/sessions`

async function getAuthHeader() {
    const token = await getValue('accessToken')
    console.log("AccessToken ", token)
    return token ? {Authorization: `Bearer ${token}`} : {};
}

async function joinMeeting(kioskName, nature) {
    const url = new URL(BASE_SESSION_URL);
    url.searchParams.append("kioskName", kioskName);
    url.searchParams.append("nature", nature);

    const res = await fetch(url.toString(), {
        method: "POST",
        headers: await getAuthHeader(),
    });
    return res.json();
}

async function rejoin(sessionId) {
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

async function getSessionStatus(sessionId) {
    const res = await fetch(`${BASE_SESSION_URL}/${sessionId}/status`, {
        method: "GET",
        headers: await getAuthHeader(),
    });

    if (!res.ok) {
        return "ERROR";
    }

    return res.json();
}

async function changeStatus(sessionId, status) {
    const url = new URL(`${BASE_SESSION_URL}/${sessionId}`);
    url.searchParams.append("status", status);

    const res = await fetch(url.toString(), {
        method: "POST",
        headers: await getAuthHeader(),
    });

    if (!res.ok) {
        throw new Error("Failed to change status");
    }

    return res.json();
}

async function updateTxnNature(request) {
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


