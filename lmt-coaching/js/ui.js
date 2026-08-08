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

/* ---- ICÔNES AU TRAIT ---- */
const ICONS = {
  phone: 'M6.6 10.8a15 15 0 006.6 6.6l2.1-2.1a1 1 0 011-.24 11 11 0 003.5.56 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.4a1 1 0 011 1 11 11 0 00.56 3.5 1 1 0 01-.25 1z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  sms: 'M21 14a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  alert: 'M12 4l9 16H3zM12 10v4M12 17.4v.1',
  star: 'M12 3.5l2.5 5.4 5.9.8-4.3 4.1 1.1 5.8-5.2-2.9-5.2 2.9 1.1-5.8-4.3-4.1 5.9-.8z',
  check: 'M4 12.5l5 5L20 6.5',
  calendar: 'M3 5h18v16H3zM3 9.5h18M8 3v4M16 3v4',
  clients: 'M4 20a6 6 0 0112 0M10 4a4 4 0 110 8 4 4 0 010-8M17 20a5 5 0 00-3-4.6',
  bell: 'M12 3a6 6 0 016 6c0 5 2 6 2 6H4s2-1 2-6a6 6 0 016-6zM10 20a2 2 0 004 0',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gear: 'M12 9.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6M19.2 15a1.5 1.5 0 00.3 1.7l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.5 1.5 0 00-2.6 1V21a2 2 0 11-4 0v-.2a1.5 1.5 0 00-2.6-1l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.5 1.5 0 00-1-2.6H3a2 2 0 110-4h.2a1.5 1.5 0 001-2.6l-.1-.1a2 2 0 112.8-2.8l.1.1a1.5 1.5 0 002.6-1V3a2 2 0 114 0v.2a1.5 1.5 0 002.6 1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.5 1.5 0 001 2.6H21a2 2 0 110 4h-.2a1.5 1.5 0 00-1.6 1z',
  theme: 'M12 3a9 9 0 100 18zM12 3a9 9 0 010 18',
  power: 'M12 3v9M18.4 6.6a9 9 0 11-12.8 0',
  logout: 'M12 3v9M18.4 6.6a9 9 0 11-12.8 0',
};

/** Icône au trait ; « euro » rend le signe € en sérif, plus lisible qu'un tracé. */
function ico(name, cls) {
  if (name === 'euro') return '<span class="ic ic-glyph ' + (cls || '') + '" aria-hidden="true">€</span>';
  const d = ICONS[name];
  if (!d) return '';
  return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
       + ' stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
       + '<path d="' + d + '"/></svg>';
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
  if (s.isMilestone || s.isSpecial) out.push('<span class="badge b-special">' + ico('star') + 'bilan cardio</span>');
  if (s.healthFlag && !o.hideHealth) out.push('<span class="badge b-health">' + ico('alert') + 'santé</span>');
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
