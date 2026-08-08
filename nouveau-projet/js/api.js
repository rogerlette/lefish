/* ================================================================
   api.js — Appels HTTP vers l'API PHP
   ================================================================ */

async function request(url, options = {}) {
  const res  = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || `Erreur HTTP ${res.status}`);
  return data;
}

function fetchItems() {
  return request(API_URL);
}

function createItem(item) {
  return request(API_URL, { method: 'POST', body: JSON.stringify(item) });
}

function updateItem(id, item) {
  return request(`${API_URL}?id=${id}`, { method: 'PUT', body: JSON.stringify(item) });
}

function deleteItem(id) {
  return request(`${API_URL}?id=${id}`, { method: 'DELETE' });
}
