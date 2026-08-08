/* ================================================================
   client.js — Fiche client détaillée
   ================================================================ */

async function viewClient(root, id) {
  root.innerHTML = '<div class="loader">Chargement…</div>';

  const data = await Api.client(id);
  const c = data.client;
  const st = c.stats;

  const remaining = st.milestoneInterval - st.milestoneProgress;
  const progress = Math.round((st.milestoneProgress / st.milestoneInterval) * 100);

  let milestoneBox = '';
  if (st.nextMilestone) {
    const callDays = Number(store.settings.milestone_call_days || 7);
    const callDate = addDays(parseSql(st.nextMilestone.startsAt), -callDays);
    milestoneBox = `
      <div class="info-box">
        <strong>★ Prochaine séance bilan : n°${st.nextMilestone.ordinal}</strong>
        <div class="small" style="margin-top:4px">
          Prévue le ${esc(fmtDateTime(st.nextMilestone.startsAt))}.<br>
          Appeler le client à partir du <strong>${esc(fmtShortDate(callDate))}</strong>
          pour lui demander ses mesures de fréquence cardiaque.
        </div>
      </div>`;
  }

  root.innerHTML = `
    <div class="card">
      <div class="row">
        <div class="avatar ${c.healthFlag ? 'warn' : ''}">${esc(initials(c.name))}</div>
        <div class="grow">
          <h1 style="margin:0">${esc(c.name)}</h1>
          <div class="small muted">
            ${esc(CLIENT_STATUS[c.status])}
            ${c.startedOn ? ' · depuis le ' + fmtShortDate(c.startedOn) : ''}
          </div>
        </div>
        <button class="small" id="editClient">Modifier</button>
      </div>
      <div class="row wrap" style="margin-top:10px;gap:8px">
        ${c.phone ? `<a class="btn small" href="tel:${esc(c.phone)}">📞 ${esc(c.phone)}</a>` : ''}
        ${c.email ? `<a class="btn small" href="mailto:${esc(c.email)}">✉ E-mail</a>` : ''}
        ${c.address ? `<span class="badge b-neutral">${esc(c.address)}</span>` : ''}
      </div>
    </div>

    <div class="tiles">
      <div class="tile"><div class="tile-value">${st.sessionsDone}</div><div class="tile-label">séances faites</div></div>
      <div class="tile"><div class="tile-value">${st.balance}</div><div class="tile-label">séances payées restantes</div></div>
      <div class="tile"><div class="tile-value">${st.sessionsUpcoming}</div><div class="tile-label">cours à venir</div></div>
      <div class="tile"><div class="tile-value">${remaining}</div><div class="tile-label">avant le bilan cardio</div></div>
    </div>

    <div class="card">
      <div class="row" style="margin-bottom:6px">
        <strong class="small">Progression vers le bilan cardio</strong>
        <span class="right small muted">${st.milestoneProgress} / ${st.milestoneInterval}</span>
      </div>
      <div class="progress"><span style="width:${progress}%"></span></div>
      ${milestoneBox}
    </div>

    ${c.healthFlag || c.notes ? `
      <div class="${c.healthFlag ? 'health-box' : 'card'}">
        <strong>${c.healthFlag ? '⚠ Vigilance santé' : 'Notes de la fiche'}</strong>
        <div class="small" style="margin-top:4px;white-space:pre-wrap">${esc(c.notes || '')}</div>
      </div>` : ''}

    <div class="card">
      <div class="card-title"><h2>Horaires récurrents</h2>
        <button class="small right" id="addRec">Ajouter</button></div>
      <div id="recList">${recurrenceListHtml(data.recurrences)}</div>
    </div>

    <div class="card">
      <div class="card-title"><h2>Cours</h2>
        <button class="small right" id="addSess">Ajouter</button></div>
      <div id="sessList">${sessionHistoryHtml(data.sessions)}</div>
    </div>

    <div class="card">
      <div class="card-title"><h2>Paiements</h2>
        <button class="small right" id="addPay">Encaisser</button></div>
      <div class="small muted" style="margin-bottom:8px">
        ${st.sessionsPaid} séance(s) payée(s) · ${st.sessionsConsumed} consommée(s) ·
        solde <strong>${st.balance}</strong> · total encaissé ${euros(st.amountPaidCents)}
      </div>
      <div id="payList">${paymentListHtml(data.payments)}</div>
    </div>
  `;

  el('editClient').onclick = () => openClientForm(c);
  el('addRec').onclick = () => openRecurrenceForm(c, null);
  el('addPay').onclick = () => openPaymentForm(c, st);
  el('addSess').onclick = () => openSessionForm({
    clientId: c.id, date: new Date(), onSaved: () => rerenderCurrent(),
  });

  qsa('#recList [data-rec]').forEach(n => {
    n.onclick = () => openRecurrenceForm(c, data.recurrences.find(r => r.id === Number(n.dataset.rec)));
  });
  qsa('#sessList [data-id]').forEach(n => {
    n.onclick = () => openSessionSheet(Number(n.dataset.id));
  });
  qsa('#payList [data-pay]').forEach(n => {
    n.onclick = guard(async () => {
      if (!confirmAction('Supprimer cet encaissement ?')) return;
      await Api.deletePayment(Number(n.dataset.pay));
      toast('Paiement supprimé');
      rerenderCurrent();
    });
  });
}

/* ---- BLOCS ---- */

function recurrenceListHtml(recs) {
  if (!recs.length) return '<div class="small muted">Aucun horaire récurrent. Les cours sont saisis à la main.</div>';
  return '<div class="list">' + recs.map(r => `
    <button class="list-item" data-rec="${r.id}">
      <span class="grow">
        <span style="font-weight:600">
          ${r.intervalWeeks > 1 ? 'Un ' + WEEKDAYS[r.weekday] + ' sur ' + r.intervalWeeks
                                : 'Tous les ' + WEEKDAYS[r.weekday]} à ${esc(r.startTime)}
        </span>
        <span class="small muted">
          ${r.duration} min${r.location ? ' · ' + esc(r.location) : ''}
          · depuis le ${fmtShortDate(r.anchorDate)}${r.untilDate ? " jusqu'au " + fmtShortDate(r.untilDate) : ''}
        </span>
      </span>
      ${r.active ? '<span class="badge b-done">actif</span>' : '<span class="badge b-cancelled">inactif</span>'}
    </button>`).join('') + '</div>';
}

function sessionHistoryHtml(sessions) {
  if (!sessions.length) return '<div class="small muted">Aucun cours enregistré.</div>';
  const now = new Date();
  const upcoming = sessions.filter(s => parseSql(s.startsAt) >= now).reverse();
  const past = sessions.filter(s => parseSql(s.startsAt) < now);

  const line = (s) => `
    <button class="list-item" data-id="${s.id}">
      <span class="grow">
        <span style="font-weight:600">${esc(fmtShortDate(s.startsAt))} · ${esc(fmtTime(s.startsAt))}</span>
        <span class="small muted truncate">
          ${s.notes ? esc(s.notes) : (s.location ? esc(s.location) : s.duration + ' min')}
        </span>
      </span>
      <span class="row" style="gap:4px">${sessionBadges(s)}</span>
    </button>`;

  return `
    ${upcoming.length ? '<div class="small muted" style="margin-bottom:6px">À venir</div>'
      + '<div class="list" style="margin-bottom:12px">' + upcoming.slice(0, 12).map(line).join('') + '</div>'
      + (upcoming.length > 12 ? '<div class="small muted" style="margin:-6px 0 12px">+ '
          + (upcoming.length - 12) + ' cours plus loin dans l\'agenda</div>' : '') : ''}
    ${past.length ? '<div class="small muted" style="margin-bottom:6px">Historique</div>'
      + '<div class="list">' + past.slice(0, 20).map(line).join('') + '</div>'
      + (past.length > 20 ? '<div class="small muted" style="margin-top:8px">+ ' + (past.length - 20) + ' plus anciens</div>' : '') : ''}`;
}

function paymentListHtml(payments) {
  if (!payments.length) return '<div class="small muted">Aucun encaissement enregistré.</div>';
  return '<div class="list">' + payments.map(p => `
    <button class="list-item" data-pay="${p.id}">
      <span class="grow">
        <span style="font-weight:600">${p.sessionsCount} séances · ${euros(p.amountCents)}</span>
        <span class="small muted">${fmtShortDate(p.paidOn)}${p.method ? ' · ' + esc(p.method) : ''}${p.note ? ' · ' + esc(p.note) : ''}</span>
      </span>
      <span class="badge b-neutral">✕</span>
    </button>`).join('') + '</div>';
}

/* ================================================================
   FORMULAIRES
   ================================================================ */

function openRecurrenceForm(client, rec) {
  const r = rec || {};
  const isNew = !rec;

  openSheet(isNew ? 'Horaire récurrent' : 'Modifier l\'horaire', `
    <div class="small muted" style="margin-bottom:8px">
      Les cours sont créés automatiquement jusqu'à
      ${esc(store.settings.horizon_weeks || 16)} semaines à l'avance.
      Un cours déplacé ensuite reste où vous l'avez mis.
    </div>

    <div class="field-row">
      <div>
        <label>Jour</label>
        <select name="weekday">${weekdayOptions(r.weekday || 2)}</select>
      </div>
      <div>
        <label>Heure</label>
        <input type="time" name="startTime" value="${esc(r.startTime || '14:00')}">
      </div>
    </div>

    <div class="field-row">
      <div>
        <label>Durée (min)</label>
        <input type="number" name="duration" value="${r.duration || client.defaultDuration || 60}" min="15" step="5">
      </div>
      <div>
        <label>Fréquence</label>
        <select name="intervalWeeks">
          <option value="1" ${Number(r.intervalWeeks || 1) === 1 ? 'selected' : ''}>Toutes les semaines</option>
          <option value="2" ${Number(r.intervalWeeks) === 2 ? 'selected' : ''}>Une semaine sur deux</option>
          <option value="3" ${Number(r.intervalWeeks) === 3 ? 'selected' : ''}>Toutes les 3 semaines</option>
          <option value="4" ${Number(r.intervalWeeks) === 4 ? 'selected' : ''}>Toutes les 4 semaines</option>
        </select>
      </div>
    </div>

    <div class="field-row">
      <div>
        <label>À partir du</label>
        <input type="date" name="anchorDate" value="${esc(r.anchorDate || toDateStr(new Date()))}">
      </div>
      <div>
        <label>Jusqu'au (facultatif)</label>
        <input type="date" name="untilDate" value="${esc(r.untilDate || '')}">
      </div>
    </div>

    <label>Lieu</label>
    <input type="text" name="location" value="${esc(r.location || '')}" placeholder="Salle, domicile…">

    ${isNew ? '' : `
      <div class="check">
        <input type="checkbox" id="recActive" name="active" ${r.active ? 'checked' : ''}>
        <label for="recActive">Règle active</label>
      </div>`}

    <div class="spacer"></div>
    <button class="block primary" id="saveRec">${isNew ? 'Créer et placer les cours' : 'Enregistrer'}</button>
    ${isNew ? '' : '<div class="spacer"></div><button class="block danger" id="delRec">Supprimer la règle</button>'}
  `, (body) => {

    el('saveRec').onclick = guard(async () => {
      const f = readForm(body);
      const payload = {
        clientId: client.id,
        weekday: Number(f.weekday),
        startTime: f.startTime,
        duration: Number(f.duration),
        intervalWeeks: Number(f.intervalWeeks),
        anchorDate: f.anchorDate,
        untilDate: f.untilDate || null,
        location: f.location || null,
      };
      if (!isNew) payload.active = f.active;

      const res = isNew
        ? await Api.createRecurrence(payload)
        : await Api.updateRecurrence(r.id, payload);

      toast(plural(res.sessionsCreated || 0, 'cours placé', 'cours placés'));
      closeSheet();
      rerenderCurrent();
    });

    if (!isNew) {
      el('delRec').onclick = guard(async () => {
        const keep = confirmAction(
          'Garder les cours déjà placés dans l\'agenda ?\n\n'
          + 'OK = garder les cours à venir · Annuler = les retirer aussi'
        );
        await Api.deleteRecurrence(r.id, keep);
        toast('Règle supprimée');
        closeSheet();
        rerenderCurrent();
      });
    }
  });
}

function openPaymentForm(client, stats) {
  const first = Number(store.settings.first_contract || 12);
  const block = Number(store.settings.payment_block || 4);
  const count = stats.sessionsPaid === 0 ? first : block;
  const amount = client.rateCents ? ((count * client.rateCents) / 100).toFixed(2) : '';

  openSheet('Encaissement', `
    <div class="small muted" style="margin-bottom:8px">
      Premier contrat : ${first} séances. Ensuite, blocs de ${block} séances payés d'avance.
    </div>

    <div class="field-row">
      <div>
        <label>Nombre de séances</label>
        <input type="number" name="sessionsCount" value="${count}" min="1" step="1">
      </div>
      <div>
        <label>Montant (€)</label>
        <input type="number" name="amountEuros" value="${amount}" step="0.01" min="0">
      </div>
    </div>

    <div class="field-row">
      <div>
        <label>Date</label>
        <input type="date" name="paidOn" value="${toDateStr(new Date())}">
      </div>
      <div>
        <label>Moyen</label>
        <select name="method">
          <option value="Espèces">Espèces</option>
          <option value="Chèque">Chèque</option>
          <option value="Virement">Virement</option>
          <option value="CB">CB</option>
          <option value="Autre">Autre</option>
        </select>
      </div>
    </div>

    <label>Note</label>
    <input type="text" name="note" placeholder="N° de chèque, remarque…">

    <div class="spacer"></div>
    <button class="block primary" id="savePay">Enregistrer l'encaissement</button>
  `, (body) => {
    el('savePay').onclick = guard(async () => {
      const f = readForm(body);
      await Api.createPayment({
        clientId: client.id,
        sessionsCount: Number(f.sessionsCount),
        amountEuros: f.amountEuros || 0,
        paidOn: f.paidOn,
        method: f.method,
        note: f.note || null,
      });
      toast('Encaissement enregistré');
      closeSheet();
      await refreshAlertCount();
      rerenderCurrent();
    });
  });
}
