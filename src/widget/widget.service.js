const BASE_HOST = 'https://khaos-api-sit-run-2.tkg-qa.spdigital.io'

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

function getAuthHeader() {
    const token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlJEQTFNVGt3TnpWQ09VUTJSa1JFTVRJMk5Ea3dNVUV6TmpJd05EQTNNMFpHT1RJNU1rWTJOZyJ9.eyJodHRwczovL3NwZ3JvdXAuY29tLnNnL3VzZXJfbWV0YWRhdGEiOnsiY29ubmVjdGlvbiI6IlVuYXR0ZW5kZWRBY2Nlc3NEQiIsImVtYWlsIjoiY2h1bmFqQHNwZ3JvdXAuY29tLnNnIiwiaWFtX2lkIjoiYXV0aDB8NjdhNThiMGMwMDdmYmI1YzJkMTIyNDFkIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJkaXNwbGF5X25hbWUiOiIiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2V9LCJpc3MiOiJodHRwczovL2lkZW50aXR5LXFhLnNwZGlnaXRhbC1ub25wcm9kLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw2N2E1OGIwYzAwN2ZiYjVjMmQxMjI0MWQiLCJhdWQiOlsiaHR0cHM6Ly9raGFvcy1hcGkuYXBwcy52cGNmLXFhLnNwZGlnaXRhbC5pby8iLCJodHRwczovL2lkZW50aXR5LXFhLnNwZGlnaXRhbC1ub25wcm9kLmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3NTA2ODc1NDYsImV4cCI6MTc1MDc3Mzk0Niwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCIsImF6cCI6Im5rMnNoSG16eDB1ZDVDSEhmS2tBNE1oMzExamxMMFplIn0.DaomUfcxJy8Z2vyw9F3iwd-XtATimVKy3nuV06sPlx_gvqMvrfTufyHuWATJikCUkCnBEA-YNEtqoLfkLPs8AtNMszDje0GFKMipRczkYspxNwBBR8cmSlPNJwbKyUmkRcvFXzI-jexxI0ZoEXGFsbGcMBCi6EePzLMp_92v1uNqRNrsHAYetsv2_1AsKiOR1wjhQah6F5wXYNDnGsaYK85xxR3BdgINIHtu9fRza8Clh0gnmbx1vKLxfiriInH6A26JTZgTgRCdDU2qvGofNX4EEzotX2S8mhDQZZmV1VfDuXZATsWplRG-AIfhFHzqQTZfcpwJ1Lizw4PFy3DwBQ'
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function joinMeeting(kioskName, nature) {
    const url = new URL(BASE_SESSION_URL);
    url.searchParams.append("kioskName", kioskName);
    url.searchParams.append("nature", nature);

    const res = await fetch(url.toString(), {
        method: "POST",
        headers: getAuthHeader(),
    });

    console.log("Response is ", JSON.stringify(res))

    return res.json();
}

async function rejoin(sessionId) {
    const res = await fetch(`${BASE_SESSION_URL}/${sessionId}/rejoin`, {
        method: "POST",
        headers: getAuthHeader(),
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
        headers: getAuthHeader(),
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
        headers: getAuthHeader(),
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


