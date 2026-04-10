// frontend/src/utils/fetchAll.js
// Fetches ALL pages from a DRF paginated endpoint automatically.
// Usage: const data = await fetchAll("/api/bookings/my/", token);

const BASE_URL = "http://127.0.0.1:8000";

export async function fetchAll(path, token) {
  let results = [];
  let url = `${BASE_URL}${path}`;

  while (url) {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Handle both paginated { count, results } and plain array responses
    if (Array.isArray(data)) {
      results = results.concat(data);
      break;
    } else if (data.results) {
      results = results.concat(data.results);
      // Follow the `next` URL if present
      url = data.next || null;
    } else {
      // Unknown shape — just return it
      results = data;
      break;
    }
  }

  return results;
}

export default fetchAll;
