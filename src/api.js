// Use relative URLs so development goes through Vite's proxy and production uses Express.
export async function api(path, body) {
  let response;
  try {
    response = await fetch(
      '/api' + path,
      body
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        : undefined,
    );
  } catch {
    throw new Error(
      'Cannot reach the Gibble API. Make sure npm run dev or npm start is running, then reconnect.',
    );
  }

  let value;
  try {
    value = await response.json();
  } catch {
    // Proxy failures and an incorrect portal URL can return HTML or an empty response.
    throw new Error(
      `The server did not return a Gibble API response (HTTP ${response.status}). Check the API terminal for errors and open the Local URL printed by npm run dev.`,
    );
  }
  if (!response.ok) throw new Error(value?.error || `Request failed (HTTP ${response.status}).`);
  return value;
}
