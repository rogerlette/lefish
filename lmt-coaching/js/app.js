/* ================================================================
   app.js — Démarrage, authentification, navigation
   ================================================================ */

const ROUTES = [
  { re: /^#\/agenda/,          title: 'Agenda',   tab: 'agenda',   run: (root) => viewAgenda(root) },
  { re: /^#\/clients/,         title: 'Clients',  tab: 'clients',  run: (root) => viewClients(root) },
  { re: /^#\/client\/(\d+)/,   title: 'Fiche client', tab: 'clients', run: (root, m) => viewClient(root, Number(m[1])) },
  { re: /^#\/alerts/,          title: 'Alertes',  tab: 'alerts',   run: (root) => viewAlerts(root) },
  { re: /^#\/stats/,           title: 'Suivi',    tab: 'stats',    run: (root) => viewStats(root) },
  { re: /^#\/settings/,        title: 'Réglages', tab: 'settings', run: (root) => viewSettings(root) },
];

/* ---- NAVIGATION ---- */

const route = guard(async function () {
  const hash = location.hash || '#/agenda';
  const root = el('app');

  for (const r of ROUTES) {
    const m = hash.match(r.re);
    if (!m) continue;

    el('topTitle').textContent = r.title;
    qsa('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === r.tab));
    closeSheet();
    await r.run(root, m);
    return;
  }

  location.hash = '#/agenda';
});

/** Recharge la vue courante (après une modification). */
function rerenderCurrent() { route(); }

/* ---- AUTHENTIFICATION ---- */

function showLogin() {
  el('login').classList.remove('hidden');
  el('shell').classList.add('hidden');
  setTimeout(() => el('loginPassword').focus(), 60);
}

async function showApp() {
  el('login').classList.add('hidden');
  el('shell').classList.remove('hidden');

  try {
    const data = await Api.settings();
    store.settings = data.settings;
    if (data.defaultPassword) {
      const b = el('banner');
      b.hidden = false;
      b.innerHTML = '⚠ Mot de passe par défaut : pensez à le changer dans '
                  + '<span class="mono">api/config.php</span>.';
    }
  } catch (e) {
    if (e instanceof AuthError) { showLogin(); return; }
    // Base pas encore installée : on propose de créer les tables.
    const b = el('banner');
    b.hidden = false;
    b.innerHTML = 'Base de données non initialisée. '
                + '<button class="small" id="initDb">Créer les tables</button>';
    el('initDb').onclick = guard(async () => {
      await Api.install();
      toast('Base initialisée');
      location.reload();
    });
  }

  await route();
  refreshAlertCount().catch(() => {});
}

/* ---- THÈME ---- */

function applyTheme(mode) {
  document.body.classList.toggle('dark', mode === 'dark');
  document.querySelector('meta[name=theme-color]')
    .setAttribute('content', mode === 'dark' ? '#101116' : '#ffffff');
  localStorage.setItem('theme', mode);
}

/* ---- DÉMARRAGE ---- */

document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(localStorage.getItem('theme')
    || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  el('btnTheme').onclick = () =>
    applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark');

  el('btnLogout').onclick = guard(async () => {
    if (!confirmAction('Se déconnecter ?')) return;
    await Api.logout();
    store.authenticated = false;
    showLogin();
  });

  el('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const err = el('loginError');
    err.hidden = true;
    try {
      await Api.login(el('loginPassword').value);
      el('loginPassword').value = '';
      store.authenticated = true;
      await showApp();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  };

  window.addEventListener('hashchange', () => route());

  // Rafraîchir le compteur d'alertes au retour sur l'application.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && store.authenticated) refreshAlertCount().catch(() => {});
  });
  setInterval(() => {
    if (!document.hidden && store.authenticated) refreshAlertCount().catch(() => {});
  }, 5 * 60 * 1000);

  try {
    const state = await Api.authState();
    store.authenticated = state.authenticated;
    if (state.authenticated) await showApp(); else showLogin();
  } catch (e) {
    showLogin();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
