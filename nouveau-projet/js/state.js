/* ================================================================
   state.js — État applicatif en mémoire
   ================================================================ */

const state = {
  items: [],
  error: null,
  loading: false,
};

function setItems(items) {
  state.items = items;
}

function addItem(item) {
  state.items.push(item);
}

function removeItem(id) {
  state.items = state.items.filter(i => i.id !== id);
}
