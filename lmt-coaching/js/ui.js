/* ================================================================
   ui.js — Briques d'interface : messages, feuille modale, étiquettes
   ================================================================ */

const el = (id) => document.getElementById(id);
const qs = (sel, root) => (root || document).querySelector(sel);
const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

/* ---- MESSAGE FLASH ---- */
let toastTimer = null;
function toast(message, isError) {
  const t = el('toast');
  t.textContent = message;
  t.className = 'toast' + (isError ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), isError ? 4200 : 2400);
}

/** Enrobe un gestionnaire asynchrone : les erreurs deviennent un message flash. */
function guard(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (e) {
      if (e instanceof AuthError) { showLogin(); return; }
      console.error(e);
      toast(e.message || 'Une erreur est survenue', true);
    }
  };
}

/* ---- FEUILLE MODALE ---- */
function openSheet(title, html, onMount) {
  el('sheetTitle').textContent = title;
  el('sheetBody').innerHTML = html;
  el('sheet').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (onMount) onMount(el('sheetBody'));
}

function closeSheet() {
  el('sheet').classList.add('hidden');
  el('sheetBody').innerHTML = '';
  document.body.style.overflow = '';
}

function confirmAction(message) {
  return window.confirm(message);
}

/* ---- ÉTIQUETTES ---- */
function statusBadge(status) {
  const s = STATUS[status] || STATUS.planned;
  return '<span class="badge b-' + status + '">' + esc(s.short) + '</span>';
}

/** Étiquettes d'un cours : n° de séance, séance spéciale, vigilance santé, statut. */
function sessionBadges(s, opts) {
  const o = opts || {};
  const out = [];
  if (s.ordinal) out.push('<span class="badge b-neutral">n°' + s.ordinal + '</span>');
  if (s.isMilestone || s.isSpecial) out.push('<span class="badge b-special">★ bilan cardio</span>');
  if (s.healthFlag) out.push('<span class="badge b-health">⚠ santé</span>');
  if (!o.hideStatus && s.status !== 'planned') out.push(statusBadge(s.status));
  return out.join(' ');
}

/* ---- FORMULAIRES ---- */
/** Récupère les champs [name] d'un conteneur sous forme d'objet. */
function readForm(root) {
  const data = {};
  qsa('[name]', root).forEach(input => {
    if (input.type === 'checkbox') data[input.name] = input.checked;
    else data[input.name] = input.value;
  });
  return data;
}

function selectOptions(map, current) {
  return Object.keys(map).map(k =>
    '<option value="' + esc(k) + '"' + (String(current) === String(k) ? ' selected' : '') + '>'
    + esc(map[k]) + '</option>'
  ).join('');
}

function weekdayOptions(current) {
  return WEEKDAYS.slice(1).map((d, i) =>
    '<option value="' + (i + 1) + '"' + (Number(current) === i + 1 ? ' selected' : '') + '>'
    + d + '</option>'
  ).join('');
}

/* ---- ÉTAT VIDE ---- */
function emptyState(text) {
  return '<div class="empty">' + esc(text) + '</div>';
}

/* ---- FERMETURE DE LA FEUILLE ---- */
document.addEventListener('DOMContentLoaded', () => {
  el('sheetClose').addEventListener('click', closeSheet);
  el('sheet').addEventListener('click', (e) => {
    if (e.target.id === 'sheet') closeSheet();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !el('sheet').classList.contains('hidden')) closeSheet();
  });
});
