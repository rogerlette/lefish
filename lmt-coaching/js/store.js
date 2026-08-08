/* ================================================================
   store.js — État partagé entre les vues
   ================================================================ */

const store = {
  authenticated: false,
  defaultPassword: false,

  // Agenda
  view: localStorage.getItem('agendaView') || 'week',  // 'week' | 'day'
  cursor: new Date(),                                   // jour de référence affiché
  sessions: [],

  // Clients
  clients: [],
  clientQuery: '',
  clientFilter: '',

  // Alertes
  alerts: [],
  alertCount: 0,

  settings: {},
};

function setAgendaView(v) {
  store.view = v;
  localStorage.setItem('agendaView', v);
}

/** Bornes de la période affichée par l'agenda. */
function agendaRange() {
  if (store.view === 'day') {
    const d = toDateStr(store.cursor);
    return { from: d, to: d };
  }
  const start = startOfWeek(store.cursor);
  return { from: toDateStr(start), to: toDateStr(addDays(start, 6)) };
}

/** Rafraîchit le compteur d'alertes de la barre d'onglets. */
async function refreshAlertCount() {
  try {
    const data = await Api.alerts(false);
    store.alerts = data.alerts;
    store.alertCount = data.pending;
    const badge = document.getElementById('alertBadge');
    badge.textContent = data.pending;
    badge.hidden = data.pending === 0;
  } catch (e) {
    if (e instanceof AuthError) throw e;
  }
}
