/* ================================================================
   utils.js — Dates, formatage, échappement
   ================================================================ */

/** Échappe le HTML : tout texte venant de la base passe par ici. */
function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ---- DATES ----
   Les dates circulent en « YYYY-MM-DD HH:MM:SS » (heure locale du coach).
   On évite new Date('...') sur ces chaînes : Safari est capricieux. */

function parseSql(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}

function pad(n) { return String(n).padStart(2, '0'); }

function toDateStr(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function toSqlDateTime(d) {
  return toDateStr(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00';
}

/** Valeur pour un <input type="datetime-local">. */
function toInputValue(sqlOrDate) {
  const d = sqlOrDate instanceof Date ? sqlOrDate : parseSql(sqlOrDate);
  if (!d) return '';
  return toDateStr(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function addDays(d, n) {
  const c = new Date(d.getTime());
  c.setDate(c.getDate() + n);
  return c;
}

/** Lundi de la semaine contenant d. */
function startOfWeek(d) {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (c.getDay() + 6) % 7; // 0 = lundi
  return addDays(c, -day);
}

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d) { return isSameDay(d, new Date()); }

/* ---- FORMATAGE ---- */

function fmtTime(sql) {
  const d = parseSql(sql);
  return d ? pad(d.getHours()) + 'h' + pad(d.getMinutes()) : '';
}

function fmtDate(sql, withYear) {
  const d = sql instanceof Date ? sql : parseSql(sql);
  if (!d) return '';
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + (withYear ? ' ' + d.getFullYear() : '');
}

function fmtDateTime(sql) {
  const d = parseSql(sql);
  if (!d) return '';
  return WEEKDAYS[((d.getDay() + 6) % 7) + 1] + ' ' + fmtDate(d) + ' à ' + fmtTime(sql);
}

function fmtShortDate(sql) {
  const d = sql instanceof Date ? sql : parseSql(sql);
  return d ? pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() : '';
}

/** « dans 3 jours », « aujourd'hui », « il y a 2 jours ». */
function relDays(sql) {
  const d = parseSql(sql);
  if (!d) return '';
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const n = Math.round((b - a) / 86400000);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n === -1) return 'hier';
  return n > 0 ? 'dans ' + n + ' j' : 'il y a ' + (-n) + ' j';
}

function euros(cents) {
  return ((cents || 0) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';
}

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase();
}

/** Étiquette de solde de séances payées. */
function balanceBadge(balance) {
  if (balance < 0) return '<span class="badge b-no_show">' + balance + ' séance(s)</span>';
  if (balance === 0) return '<span class="badge b-late_cancel">à régler</span>';
  if (balance <= 1) return '<span class="badge b-late_cancel">' + balance + ' restante</span>';
  return '<span class="badge b-neutral">' + balance + ' restantes</span>';
}

function plural(n, one, many) {
  return n + ' ' + (Math.abs(n) > 1 ? (many || one + 's') : one);
}
