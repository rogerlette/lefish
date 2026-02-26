/**
 * state.js
 * État global de l'application et helpers de date.
 */

let lots = [];
let nextId = 1;
let currentDate = new Date();
let modalSpeciesKey = null;
let modalCalibreKey = null;
let collapsedSpecies = {};
let collapsedCalibre = {};

// ---- Helpers date ----

function formatDateDisplay(date) {
  const days   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function updateDateDisplay() {
  const el = document.getElementById('dateDisplay');
  if (el) el.textContent = formatDateDisplay(currentDate);
}

function addDays(days) {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ---- Navigation temporelle ----

function shiftDays(n) {
  const sign = n > 0 ? 1 : -1;
  const steps = Math.abs(n);
  lots.forEach(l => {
    for (let i = 0; i < steps; i++) {
      const gain = dailyGain(l.speciesKey, l.currentWeight) * sign;
      l.currentWeight = parseFloat((l.currentWeight + gain).toFixed(2));
      if (l.currentWeight < 1) l.currentWeight = 1;
    }
  });
  currentDate = new Date(currentDate);
  currentDate.setDate(currentDate.getDate() + n);
  updateDateDisplay();
  render();
  bulkUpdateDb();
}

// ---- Dark mode ----

function toggleDark() {
  const isDark = document.body.classList.toggle('dark');
  document.getElementById('darkToggleBtn').textContent = isDark ? '🌙' : '☀️';
}
