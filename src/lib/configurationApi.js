import { apiRequest } from "./authApi";

const API_PORT = import.meta.env.VITE_API_PORT || 4000;
const API_BASE =
  window.location.hostname === "localhost"
    ? `http://localhost:${API_PORT}`
    : "";

export function getConfiguration() {
  return apiRequest(`${API_BASE}/api/configuration`);
}

export function updateConfiguration(payload) {
  return apiRequest(`${API_BASE}/api/configuration`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
