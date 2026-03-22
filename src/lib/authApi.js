export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({ ok: false, error: 'Invalid server response.' }));

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || 'Request failed.');
  }

  return payload;
}

export function signIn(payload) {
  return apiRequest('/api/auth/sign-in', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function signUp(payload) {
  return apiRequest('/api/auth/sign-up', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
