/* ================================================================
   alerts.js — Centre de notifications du coach
   ================================================================ */

let alertsShowAll = false;

async function viewAlerts(root) {
  root.innerHTML = `
    <div class="row wrap" style="margin-bottom:12px">
      <div class="segmented" id="alFilter">
        <button data-all="0" class="${alertsShowAll ? '' : 'on'}">À traiter</button>
        <button data-all="1" class="${alertsShowAll ? 'on' : ''}">Tout</button>
      </div>
      <span class="right small muted" id="alCount"></span>
    </div>
    <div id="alList"><div class="loader">Chargement…</div></div>
  `;

  qsa('#alFilter button').forEach(b => {
    b.onclick = () => { alertsShowAll = b.dataset.all === '1'; viewAlerts(root); };
  });

  await loadAlerts();
}

const loadAlerts = guard(async function () {
  const data = await Api.alerts(alertsShowAll);
  store.alerts = data.alerts;
  el('alCount').textContent = data.pending
    ? data.pending + ' à traiter'
    : 'rien à traiter';

  const badge = el('alertBadge');
  badge.textContent = data.pending;
  badge.hidden = data.pending === 0;

  el('alList').innerHTML = data.alerts.length
    ? data.alerts.map(alertHtml).join('')
    : emptyState('Tout est à jour. Rien à faire pour l\'instant.');

  qsa('#alList [data-act]').forEach(btn => {
    const key = btn.dataset.key;
    const act = btn.dataset.act;

    if (act === 'ack')   btn.onclick = guard(async () => { await Api.ackAlert(key);   toast('Marqué comme fait'); loadAlerts(); });
    if (act === 'unack') btn.onclick = guard(async () => { await Api.unackAlert(key); toast('Remis en attente');  loadAlerts(); });
    if (act === 'session') btn.onclick = () => openSessionSheet(Number(btn.dataset.session));
    if (act === 'client')  btn.onclick = () => { location.hash = '#/client/' + btn.dataset.client; };
  });
});

const ALERT_ICONS = {
  milestone_call: '📞',
  payment_due:    '💶',
  to_confirm:     '✓',
  no_upcoming:    '📅',
  missing_email:  '✉',
};

function alertHtml(a) {
  return `
    <div class="alert ${a.severity} ${a.acked ? 'acked' : ''}">
      <div class="alert-title">${ALERT_ICONS[a.type] || '•'} ${esc(a.title)}</div>
      <div class="alert-msg">${esc(a.message)}</div>
      <div class="alert-actions">
        ${a.phone && a.type === 'milestone_call'
          ? `<a class="btn small primary" href="tel:${esc(a.phone)}">Appeler ${esc(a.phone)}</a>` : ''}
        ${a.sessionId ? `<button class="small" data-act="session" data-session="${a.sessionId}">Voir le cours</button>` : ''}
        ${a.clientId ? `<button class="small" data-act="client" data-client="${a.clientId}">Fiche client</button>` : ''}
        ${a.acked
          ? `<button class="small ghost" data-act="unack" data-key="${esc(a.key)}">Rouvrir</button>`
          : `<button class="small" data-act="ack" data-key="${esc(a.key)}">C'est fait</button>`}
      </div>
    </div>`;
}
