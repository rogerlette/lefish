/* ================================================================
   session.js — Détail d'un cours (feuille modale)
   ================================================================ */

const openSessionSheet = guard(async function (id) {
  const data = await Api.session(id);
  const s = data.session;
  const c = data.client;
  const st = c.stats;

  const lastReminder = (data.reminders || []).find(r => r.kind === 'reminder' && Number(r.ok) === 1);

  openSheet(fmtDateTime(s.startsAt), `
    <div class="row wrap" style="gap:6px;margin-bottom:10px">
      ${sessionBadges(s)}
      <span class="badge b-neutral">${s.duration} min</span>
      ${s.location ? '<span class="badge b-neutral">' + esc(s.location) + '</span>' : ''}
      ${s.movedCount ? '<span class="badge b-late_cancel">déplacé ' + s.movedCount + '×</span>' : ''}
    </div>

    <div class="card" style="margin-bottom:10px">
      <div class="row">
        <div class="avatar ${c.healthFlag ? 'warn' : ''}">${esc(initials(c.name))}</div>
        <div class="grow">
          <div style="font-weight:600">${esc(c.name)}</div>
          <div class="small muted">
            Séance ${s.ordinal || '—'} · ${balanceBadge(st.balance)}
          </div>
        </div>
        <a class="btn small" href="#/client/${c.id}" id="goClient">Fiche</a>
      </div>
      <div class="row wrap" style="margin-top:10px;gap:8px">
        ${c.phone ? `<a class="btn small" href="tel:${esc(c.phone)}">📞 Appeler</a>
                     <a class="btn small" href="sms:${esc(c.phone)}">💬 SMS</a>` : ''}
        ${c.email ? `<a class="btn small" href="mailto:${esc(c.email)}">✉ E-mail</a>` : ''}
      </div>
    </div>

    ${c.healthFlag || c.notes ? `
      <div class="${c.healthFlag ? 'health-box' : 'card'}">
        <strong>${c.healthFlag ? '⚠ Fiche client — vigilance' : 'Fiche client'}</strong>
        <div class="small" style="margin-top:4px;white-space:pre-wrap">${esc(c.notes || 'Aucune note.')}</div>
      </div>` : ''}

    ${(s.isMilestone || s.isSpecial) ? `
      <div class="info-box">
        <strong>★ Séance bilan (n°${s.ordinal || '?'})</strong>
        <div class="small" style="margin-top:4px">
          Le client doit arriver avec ses mesures de fréquence cardiaque.
          Prévenir par téléphone ${esc(store.settings.milestone_call_days || 7)} jours avant.
        </div>
      </div>` : ''}

    <label>Notes de ce cours</label>
    <textarea name="notes" rows="3" placeholder="Exercices réalisés, ressenti, charge…">${esc(s.notes || '')}</textarea>
    <button class="block small" id="saveNotes" style="margin-top:8px">Enregistrer les notes</button>

    <label>Statut de la séance</label>
    <div class="row wrap" style="gap:6px">
      ${Object.keys(STATUS).map(k => `
        <button class="small ${s.status === k ? 'primary' : ''}" data-status="${k}">${esc(STATUS[k].label)}</button>
      `).join('')}
    </div>
    <div class="small muted" style="margin-top:6px">
      « Effectué », « Annulé tardif » et « Absent » décomptent une séance payée.
    </div>

    <label>Déplacer le cours</label>
    <div class="field-row">
      <input type="datetime-local" name="startsAt" value="${toInputValue(s.startsAt)}">
      <input type="number" name="duration" value="${s.duration}" min="15" step="5" style="max-width:96px">
    </div>
    <div class="check">
      <input type="checkbox" id="notifyMove" ${c.email ? 'checked' : 'disabled'}>
      <label for="notifyMove">Prévenir le client par e-mail${c.email ? '' : ' (aucune adresse)'}</label>
    </div>
    <button class="block" id="moveSession">Déplacer</button>

    <label>Rappel automatique</label>
    <div class="small muted">
      ${c.reminderEmail
        ? (c.email
            ? 'Envoi ' + (c.reminderDays !== null ? c.reminderDays : (store.settings.reminder_days || 2))
              + ' jour(s) avant le cours à ' + esc(c.email) + '.'
            : 'Activé mais aucune adresse e-mail sur la fiche.')
        : 'Désactivé pour ce client.'}
      ${lastReminder ? '<br>Dernier envoi : ' + esc(fmtShortDate(lastReminder.sent_at)) : ''}
    </div>
    <button class="block small" id="sendReminder" style="margin-top:8px"
      ${c.email ? '' : 'disabled'}>Envoyer le rappel maintenant</button>

    <div class="spacer"></div>
    <button class="block danger" id="deleteSession">Supprimer ce cours</button>
  `, (body) => {

    el('goClient').onclick = () => closeSheet();

    el('saveNotes').onclick = guard(async () => {
      await Api.updateSession(s.id, { notes: qs('[name=notes]', body).value });
      toast('Notes enregistrées');
    });

    qsa('[data-status]', body).forEach(btn => {
      btn.onclick = guard(async () => {
        const status = btn.dataset.status;
        let notify = false;
        if (status === 'cancelled' && c.email) {
          notify = confirmAction('Prévenir ' + c.name + ' par e-mail de l\'annulation ?');
        }
        await Api.updateSession(s.id, { status, notifyClient: notify });
        toast('Statut : ' + STATUS[status].label);
        closeSheet();
        await refreshAlertCount();
        rerenderCurrent();
      });
    });

    el('moveSession').onclick = guard(async () => {
      const f = readForm(body);
      const res = await Api.updateSession(s.id, {
        startsAt: f.startsAt,
        duration: Number(f.duration) || s.duration,
        notifyClient: el('notifyMove').checked,
      });
      if (res.conflicts && res.conflicts.length) {
        toast('Déplacé — attention, créneau partagé avec ' + res.conflicts[0].clientName, true);
      } else {
        toast(res.notified && res.notified.sent ? 'Cours déplacé, client prévenu' : 'Cours déplacé');
      }
      closeSheet();
      await refreshAlertCount();
      rerenderCurrent();
    });

    el('sendReminder').onclick = guard(async () => {
      const res = await Api.remind(s.id);
      toast(res.sent ? 'Rappel envoyé à ' + res.to : 'Non envoyé : ' + (res.reason || 'inconnu'), !res.sent);
    });

    el('deleteSession').onclick = guard(async () => {
      if (!confirmAction('Supprimer définitivement ce cours ?')) return;
      await Api.deleteSession(s.id);
      toast('Cours supprimé');
      closeSheet();
      await refreshAlertCount();
      rerenderCurrent();
    });
  });
});
