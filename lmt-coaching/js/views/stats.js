/* ================================================================
   stats.js — Suivi d'activité
   ================================================================ */

let statsMonth = null;

async function viewStats(root) {
  const month = statsMonth || new Date().toISOString().slice(0, 7);
  root.innerHTML = '<div class="loader">Chargement…</div>';

  const s = await Api.stats(month);
  const [y, m] = month.split('-').map(Number);
  const maxSessions = Math.max(1, ...s.history.map(h => Number(h.n)));

  root.innerHTML = `
    <div class="datebar">
      <button class="icon-btn" id="stPrev" aria-label="Mois précédent">‹</button>
      <div class="label">${esc(MONTHS[m - 1])} ${y}</div>
      <button class="icon-btn" id="stNext" aria-label="Mois suivant">›</button>
    </div>

    <div class="tiles">
      <div class="tile"><div class="tile-value">${s.sessions.done}</div><div class="tile-label">séances faites</div></div>
      <div class="tile"><div class="tile-value">${s.sessions.planned}</div><div class="tile-label">encore prévues</div></div>
      <div class="tile"><div class="tile-value">${euros(s.money.cashedCents)}</div><div class="tile-label">encaissé</div></div>
      <div class="tile"><div class="tile-value">${s.clients.active}</div><div class="tile-label">clients actifs</div></div>
    </div>

    <div class="card">
      <div class="card-title"><h2>Détail du mois</h2></div>
      <div class="list">
        <div class="list-item"><span class="grow">Séances effectuées</span><strong>${s.sessions.done}</strong></div>
        <div class="list-item"><span class="grow">Annulations excusées</span><strong>${s.sessions.cancelled}</strong></div>
        <div class="list-item"><span class="grow">Annulations tardives (décomptées)</span><strong>${s.sessions.lateCancel}</strong></div>
        <div class="list-item"><span class="grow">Absences (décomptées)</span><strong>${s.sessions.noShow}</strong></div>
        <div class="list-item"><span class="grow">Clients vus</span><strong>${s.sessions.clients}</strong></div>
        <div class="list-item"><span class="grow">Encaissements</span><strong>${s.money.payments} · ${euros(s.money.cashedCents)}</strong></div>
        <div class="list-item"><span class="grow">Séances faites non payées</span>
          <strong>${s.money.outstandingSessions}${s.money.outstandingCents ? ' · ' + euros(s.money.outstandingCents) : ''}</strong></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><h2>Séances sur 12 mois</h2></div>
      <div class="bars">
        ${s.history.map(h => `
          <div class="bar" title="${esc(h.m)} : ${h.n}">
            <i style="height:${Math.round((Number(h.n) / maxSessions) * 100)}%"></i>
            <small>${esc(h.m.slice(5))}</small>
          </div>`).join('') || '<div class="small muted">Pas encore de données.</div>'}
      </div>
    </div>

    <div class="card">
      <div class="card-title"><h2>Semaine en cours</h2></div>
      <div class="small muted">
        ${plural(s.week.sessions, 'cours', 'cours')} à partir du ${fmtShortDate(s.week.start)}.
      </div>
    </div>
  `;

  el('stPrev').onclick = () => { statsMonth = shiftMonth(month, -1); viewStats(root); };
  el('stNext').onclick = () => { statsMonth = shiftMonth(month, 1);  viewStats(root); };
}

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1);
}
