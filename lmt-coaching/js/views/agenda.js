/* ================================================================
   agenda.js — Vue agenda (semaine / jour)
   ================================================================ */

async function viewAgenda(root) {
  const range = agendaRange();
  root.innerHTML = `
    <div class="datebar">
      <button class="icon-btn" id="agPrev" aria-label="Précédent">‹</button>
      <div class="label" id="agLabel">…</div>
      <button class="icon-btn" id="agNext" aria-label="Suivant">›</button>
    </div>
    <div id="agStrip"></div>
    <div class="row wrap" style="margin:12px 0">
      <div class="segmented">
        <button data-view="day"  class="${store.view === 'day' ? 'on' : ''}">Jour</button>
        <button data-view="week" class="${store.view === 'week' ? 'on' : ''}">Semaine</button>
      </div>
      <button class="small" id="agToday">Aujourd'hui</button>
      <span class="right small muted" id="agCount"></span>
    </div>
    <div id="agDays"><div class="loader">Chargement…</div></div>
    <button class="fab" id="agAdd" title="Nouveau cours">+</button>
  `;

  el('agPrev').onclick = () => shiftAgenda(-1);
  el('agNext').onclick = () => shiftAgenda(1);
  el('agToday').onclick = () => { store.cursor = new Date(); viewAgenda(root); };
  el('agAdd').onclick = () => openSessionForm({ date: store.cursor });
  qsa('[data-view]', root).forEach(b => {
    b.onclick = () => { setAgendaView(b.dataset.view); viewAgenda(root); };
  });

  el('agLabel').textContent = agendaLabel();
  enableSwipe(el('agDays'), shiftAgenda);

  await guard(async () => {
    const week = startOfWeek(store.cursor);
    store.weekSessions = await Api.sessions(toDateStr(week), toDateStr(addDays(week, 6)));
    store.sessions = store.view === 'day'
      ? store.weekSessions.filter(s => s.startsAt.slice(0, 10) === range.from)
      : store.weekSessions;
    renderStrip(el('agStrip'));
    renderDays(el('agDays'), range);
    const active = store.sessions.filter(s => s.status !== 'cancelled').length;
    el('agCount').textContent = active ? plural(active, 'cours', 'cours') : 'aucun cours';
  })();
}

function agendaLabel() {
  if (store.view === 'day') {
    const d = store.cursor;
    return WEEKDAYS[((d.getDay() + 6) % 7) + 1] + ' ' + fmtDate(d, true);
  }
  const a = startOfWeek(store.cursor);
  const b = addDays(a, 6);
  const sameMonth = a.getMonth() === b.getMonth();
  return sameMonth
    ? a.getDate() + ' – ' + b.getDate() + ' ' + MONTHS[b.getMonth()] + ' ' + b.getFullYear()
    : fmtDate(a) + ' – ' + fmtDate(b, true);
}

function shiftAgenda(direction) {
  store.cursor = addDays(store.cursor, direction * (store.view === 'day' ? 1 : 7));
  viewAgenda(el('app'));
}

/** Balayage horizontal pour changer de semaine / de jour. */
function enableSwipe(node, onSwipe) {
  let x0 = null, y0 = null;
  node.addEventListener('touchstart', e => {
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  node.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) onSwipe(dx < 0 ? 1 : -1);
    x0 = null;
  }, { passive: true });
}

/** Bandeau des sept jours : charge de la semaine et navigation d'un appui. */
function renderStrip(container) {
  const start = startOfWeek(store.cursor);
  const short = ['', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
  let html = '<div class="weekstrip">';

  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const key = toDateStr(d);
    const n = (store.weekSessions || []).filter(s =>
      s.startsAt.slice(0, 10) === key && s.status !== 'cancelled').length;
    const selected = store.view === 'day' && key === toDateStr(store.cursor);
    html += `
      <button class="wday ${isToday(d) ? 'today' : ''}" data-day="${key}" aria-pressed="${selected}">
        <em>${short[((d.getDay() + 6) % 7) + 1]}</em>
        <b>${d.getDate()}</b>
        <u class="${n ? '' : 'none'}">${n || ''}</u>
      </button>`;
  }
  container.innerHTML = html + '</div>';

  qsa('[data-day]', container).forEach(b => {
    b.onclick = () => {
      store.cursor = parseSql(b.dataset.day);
      if (store.view !== 'day') setAgendaView('day');
      viewAgenda(el('app'));
    };
  });
}

/** Journée détaillée : plage horaire complète et respirations entre les cours. */
function dayBodyHtml(items) {
  let out = '';
  items.forEach((s, i) => {
    if (i > 0) {
      const prev = items[i - 1];
      const gap = (parseSql(s.startsAt) - parseSql(prev.startsAt)) / 60000 - prev.duration;
      if (gap >= 45) {
        const h = Math.floor(gap / 60), m = Math.round(gap % 60);
        out += `<div class="gap">${h ? h + ' h ' : ''}${m ? m + ' min' : ''} de libre</div>`;
      }
    }
    out += slotHtml(s, true);
  });
  return out;
}

function renderDays(container, range) {
  const start = parseSql(range.from);
  const count = store.view === 'day' ? 1 : 7;
  const byDay = {};
  store.sessions.forEach(s => {
    const key = s.startsAt.slice(0, 10);
    (byDay[key] = byDay[key] || []).push(s);
  });

  let html = '';
  for (let i = 0; i < count; i++) {
    const d = addDays(start, i);
    const key = toDateStr(d);
    const items = byDay[key] || [];
    if (count === 1) {
      const total = items.reduce((n, s) => n + s.duration, 0);
      html += `
        <section class="day today">
          <div class="dayline">
            <b>${WEEKDAYS[((d.getDay() + 6) % 7) + 1]} ${d.getDate()} ${MONTHS[d.getMonth()]}</b>
            <span>${items.length ? plural(items.length, 'cours', 'cours') + ' · '
                     + (total >= 60 ? Math.floor(total / 60) + ' h' + (total % 60 ? String(total % 60).padStart(2, '0') : '')
                                    : total + ' min') : ''}</span>
          </div>
          ${items.length ? dayBodyHtml(items) : '<div class="empty">Aucun cours ce jour.</div>'}
        </section>`;
    } else {
      html += `
        <section class="day ${isToday(d) ? 'today' : ''} ${items.length ? '' : 'free'}">
          <div class="day-head">
            <span class="day-name">${WEEKDAYS[((d.getDay() + 6) % 7) + 1]}</span>
            <span class="day-date">${d.getDate()} ${MONTHS[d.getMonth()]}</span>
            <span class="day-count">${items.length || 'libre'}</span>
          </div>
          ${items.map(s => slotHtml(s)).join('')}
        </section>`;
    }
  }

  container.className = store.view === 'week' ? 'week-grid' : '';
  container.innerHTML = html;

  qsa('.slot', container).forEach(node => {
    node.onclick = () => openSessionSheet(Number(node.dataset.id));
  });
}

function slotHtml(s, withRange) {
  const time = withRange
    ? `<span class="range">${fmtTime(s.startsAt)}<small>${fmtTime(s.endsAt)}</small></span>`
    : `<span class="slot-time">${fmtTime(s.startsAt)}</span>`;
  return `
    <button class="slot s-${s.status} ${s.isMilestone || s.isSpecial ? 'milestone' : ''}" data-id="${s.id}">
      ${time}
      <span class="slot-main">
        <span class="slot-name truncate">${esc(s.clientName)}</span>
        <span class="slot-meta">
          ${s.duration} min${s.location ? ' · ' + esc(s.location) : ''}
          ${sessionBadges(s)}
        </span>
      </span>
    </button>`;
}

/* ================================================================
   CRÉATION D'UN COURS
   ================================================================ */

async function openSessionForm(opts) {
  const o = opts || {};
  const clients = await Api.clients('', 'all');
  const actives = clients.filter(c => c.status !== 'archived');
  const day = o.date ? toDateStr(o.date) : toDateStr(new Date());

  openSheet('Nouveau cours', `
    <label>Client</label>
    <select name="clientId">
      ${actives.map(c => `<option value="${c.id}" ${o.clientId === c.id ? 'selected' : ''}>
          ${esc(c.name)}</option>`).join('')}
    </select>

    <div id="modeSingle">
      <label>Date et heure</label>
      <input type="datetime-local" name="startsAt" value="${day}T09:00">
    </div>

    <div id="modeMulti" class="hidden">
      <label>Liste d'horaires (une par ligne : <span class="mono">2026-03-04 14:00</span>)</label>
      <textarea name="slots" rows="6" placeholder="2026-03-04 14:00&#10;2026-03-11 14:00&#10;2026-03-18 09:30"></textarea>
    </div>

    <div class="field-row">
      <div>
        <label>Durée (min)</label>
        <input type="number" name="duration" value="60" min="15" step="5">
      </div>
      <div>
        <label>Lieu</label>
        <input type="text" name="location" placeholder="Salle, domicile…">
      </div>
    </div>

    <label>Notes du cours</label>
    <textarea name="notes" rows="2" placeholder="Objectif de la séance, matériel…"></textarea>

    <div class="spacer"></div>
    <button class="block primary" id="saveSession">Créer</button>
    <div class="spacer"></div>
    <button class="block ghost small" id="toggleMode">Saisir plusieurs créneaux d'un coup</button>
  `, (body) => {
    let multi = false;

    el('toggleMode').onclick = () => {
      multi = !multi;
      el('modeSingle').classList.toggle('hidden', multi);
      el('modeMulti').classList.toggle('hidden', !multi);
      el('toggleMode').textContent = multi ? 'Revenir à un seul créneau' : "Saisir plusieurs créneaux d'un coup";
      el('saveSession').textContent = multi ? 'Créer les cours' : 'Créer';
    };

    el('saveSession').onclick = guard(async () => {
      const f = readForm(body);
      const base = {
        clientId: Number(f.clientId),
        duration: Number(f.duration) || 60,
        location: f.location || null,
      };
      if (!base.clientId) { toast('Choisissez un client', true); return; }

      if (multi) {
        const slots = parseSlotList(f.slots);
        if (!slots.length) { toast('Aucun horaire valide', true); return; }
        const res = await Api.batchSessions({ ...base, slots });
        toast(plural(res.created.length, 'cours créé', 'cours créés'));
        if (res.errors.length) console.warn(res.errors);
      } else {
        const res = await Api.createSession({ ...base, startsAt: f.startsAt, notes: f.notes || null });
        if (res.conflicts && res.conflicts.length) {
          toast('Attention : créneau déjà occupé par ' + res.conflicts[0].clientName, true);
        } else {
          toast('Cours créé');
        }
      }

      closeSheet();
      refreshAlertCount();
      if (o.onSaved) o.onSaved(); else viewAgenda(el('app'));
    });
  });
}

/**
 * Analyse une liste d'horaires saisie librement.
 * Accepte « 2026-03-04 14:00 », « 04/03/2026 14h00 », « 4/3 14:00 » (année en cours).
 */
function parseSlotList(text) {
  const out = [];
  (text || '').split(/[\n;]+/).forEach(line => {
    const raw = line.trim();
    if (!raw) return;
    let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2})[:hH](\d{2})?/);
    if (m) {
      out.push({ startsAt: `${m[1]}-${m[2]}-${m[3]} ${pad(m[4])}:${pad(m[5] || 0)}:00` });
      return;
    }
    m = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2})[:hH](\d{2})?/);
    if (m) {
      let year = m[3] ? Number(m[3]) : new Date().getFullYear();
      if (year < 100) year += 2000;
      out.push({ startsAt: `${year}-${pad(m[2])}-${pad(m[1])} ${pad(m[4])}:${pad(m[5] || 0)}:00` });
    }
  });
  return out;
}
