/* ================================================================
   api.js — Dialogue avec l'API PHP
   ================================================================ */

/** Levée quand la session a expiré : app.js repasse alors sur l'écran de connexion. */
class AuthError extends Error {}

async function request(path, options = {}) {
  const res = await fetch(API + path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  let data = null;
  try { data = await res.json(); } catch (e) { /* réponse vide */ }

  if (res.status === 401) throw new AuthError((data && data.error) || 'Session expirée');
  if (!res.ok) throw new Error((data && data.error) || 'Erreur ' + res.status);
  return data;
}

const get  = (p)       => request(p);
const post = (p, body) => request(p, { method: 'POST',   body: JSON.stringify(body || {}) });
const put  = (p, body) => request(p, { method: 'PUT',    body: JSON.stringify(body || {}) });
const del  = (p)       => request(p, { method: 'DELETE' });

/* ---- Points d'entrée ---- */
const Api = {
  // Authentification
  authState:  ()      => get('auth.php'),
  login:      (pwd)   => post('auth.php', { password: pwd }),
  logout:     ()      => post('auth.php?action=logout'),

  // Clients
  clients:    (q, status) => get('clients.php?q=' + encodeURIComponent(q || '')
                                 + '&status=' + encodeURIComponent(status || '')),
  client:     (id)    => get('clients.php?id=' + id),
  createClient: (b)   => post('clients.php', b),
  updateClient: (id, b) => put('clients.php?id=' + id, b),
  deleteClient: (id)  => del('clients.php?id=' + id),

  // Agenda
  sessions:   (from, to, clientId) => get('sessions.php?from=' + from + '&to=' + to
                                          + (clientId ? '&clientId=' + clientId : '')),
  session:    (id)    => get('sessions.php?id=' + id),
  createSession: (b)  => post('sessions.php', b),
  batchSessions: (b)  => post('sessions.php?action=batch', b),
  updateSession: (id, b) => put('sessions.php?id=' + id, b),
  deleteSession: (id) => del('sessions.php?id=' + id),
  remind:     (id)    => post('sessions.php?action=remind&id=' + id),

  // Récurrences
  recurrences: (clientId) => get('recurrences.php?clientId=' + clientId),
  createRecurrence: (b)   => post('recurrences.php', b),
  updateRecurrence: (id, b) => put('recurrences.php?id=' + id, b),
  deleteRecurrence: (id, keep) => del('recurrences.php?id=' + id + (keep ? '&keepSessions=1' : '')),

  // Paiements
  payments:   (clientId) => get('payments.php?clientId=' + clientId),
  createPayment: (b)  => post('payments.php', b),
  deletePayment: (id) => del('payments.php?id=' + id),

  // Alertes
  alerts:     (all)   => get('notifications.php' + (all ? '?all=1' : '')),
  ackAlert:   (key)   => post('notifications.php?action=ack', { key }),
  unackAlert: (key)   => post('notifications.php?action=unack', { key }),

  // Réglages et suivi
  settings:   ()      => get('settings.php'),
  saveSettings: (b)   => put('settings.php', b),
  stats:      (month) => get('stats.php' + (month ? '?month=' + month : '')),
  installState: ()    => get('install.php'),
  install:    ()      => post('install.php'),
};
