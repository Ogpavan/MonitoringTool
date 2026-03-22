import { apiRequest } from "./authApi";

const API_PORT = import.meta.env.VITE_API_PORT || 4000;
const API_BASE =
  window.location.hostname === "localhost"
    ? `http://localhost:${API_PORT}`
    : "";

export function getSslDomains() {
  return apiRequest(`${API_BASE}/api/ssl-domains`);
}

export function bulkInsertSslDomains(payload) {
  return apiRequest(`${API_BASE}/api/ssl-domains/bulk`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getSslScanStatus() {
  return apiRequest(`${API_BASE}/api/ssl-domains/scan-status`);
}

export function runSslScanNow(payload = {}) {
  return apiRequest(`${API_BASE}/api/ssl-domains/scan-now`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
