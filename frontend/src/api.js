const BASE = "/api";

function authHeaders() {
  const token = localStorage.getItem("gantry_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {
      /* no json body */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  async register(username, password) {
    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return handle(res);
  },

  async login(username, password) {
    const form = new URLSearchParams();
    form.set("username", username);
    form.set("password", password);
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    return handle(res);
  },

  async me() {
    const res = await fetch(`${BASE}/auth/me`, { headers: { ...authHeaders() } });
    return handle(res);
  },

  async rates() {
    const res = await fetch(`${BASE}/rates`);
    return handle(res);
  },

  async availability() {
    const res = await fetch(`${BASE}/spots/availability`, { headers: { ...authHeaders() } });
    return handle(res);
  },

  async spots(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""))
    );
    const res = await fetch(`${BASE}/spots?${qs}`, { headers: { ...authHeaders() } });
    return handle(res);
  },

  async checkIn(plate, spot_type) {
    const res = await fetch(`${BASE}/sessions/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ plate, spot_type }),
    });
    return handle(res);
  },

  async checkOut(plate) {
    const res = await fetch(`${BASE}/sessions/check-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ plate }),
    });
    return handle(res);
  },

  async sessions(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""))
    );
    const res = await fetch(`${BASE}/sessions?${qs}`, { headers: { ...authHeaders() } });
    return handle(res);
  },
};
