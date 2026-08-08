/* ================================================================
   app.js — Rendu et initialisation
   ================================================================ */

function render() {
  const list = document.getElementById('itemList');

  if (state.error) {
    list.innerHTML = `<div class="error">${state.error}</div>`;
    return;
  }

  if (state.loading) {
    list.innerHTML = '<div class="empty">Chargement…</div>';
    return;
  }

  if (state.items.length === 0) {
    list.innerHTML = '<div class="empty">Aucun élément pour le moment.</div>';
    return;
  }

  list.innerHTML = state.items.map(item => `
    <div class="item">
      <div class="item-main">
        <div class="item-name">${escapeHtml(item.name)}</div>
        ${item.description ? `<div class="item-desc">${escapeHtml(item.description)}</div>` : ''}
      </div>
      <span class="item-qty">${item.quantity}</span>
      <button class="danger" onclick="onDelete(${item.id})">Supprimer</button>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ---- ACTIONS ---- */

async function onCreate(event) {
  event.preventDefault();

  const name        = document.getElementById('inputName').value.trim();
  const description = document.getElementById('inputDescription').value.trim();
  const quantity    = parseInt(document.getElementById('inputQuantity').value, 10) || 0;

  if (!name) return;

  try {
    addItem(await createItem({ name, description, quantity }));
    state.error = null;
    event.target.reset();
  } catch (err) {
    state.error = err.message;
  }
  render();
}

async function onDelete(id) {
  try {
    await deleteItem(id);
    removeItem(id);
    state.error = null;
  } catch (err) {
    state.error = err.message;
  }
  render();
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

/* ---- INITIALISATION ---- */

async function init() {
  document.title = APP_NAME;
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');

  document.getElementById('itemForm').addEventListener('submit', onCreate);

  state.loading = true;
  render();

  try {
    setItems(await fetchItems());
    state.error = null;
  } catch (err) {
    state.error = err.message;
  }

  state.loading = false;
  render();
}

document.addEventListener('DOMContentLoaded', init);
