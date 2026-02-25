/**
 * render.js
 * Fonctions de rendu DOM : liste des espèces, calibres, lots, résumé.
 */

// ================================================================
// POINT D'ENTRÉE DU RENDU
// ================================================================
function render() {
  updateDateDisplay();
  renderSummaryBar();
  renderSpeciesList();
}

// ================================================================
// BARRE DE RÉSUMÉ
// ================================================================
function renderSummaryBar() {
  const bar = document.getElementById('summaryBar');
  if (!bar) return;

  let html = '';
  let grandTotal = 0;

  SPECIES.forEach(sp => {
    const spLots = lots.filter(l => l.speciesKey === sp.key);
    if (spLots.length === 0) return;
    const total = spLots.reduce((s, l) => s + getValue(l).totalMargin, 0);
    grandTotal += total;
    html += `
      <div class="sum-item">
        <span class="sum-dot" style="background:${sp.color}"></span>
        <span class="sum-label">${sp.name}</span>
        <span class="sum-value">${total >= 0 ? '+' : ''}${total.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €</span>
      </div>
      <div class="sum-divider"></div>
    `;
  });

  html += `<span class="sum-total">${grandTotal >= 0 ? '+' : ''}${grandTotal.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} € marge totale</span>`;
  bar.innerHTML = html;
}

// ================================================================
// LISTE DES ESPÈCES
// ================================================================
function renderSpeciesList() {
  const container = document.getElementById('speciesList');
  let html = '';

  SPECIES.forEach(sp => {
    const spLots = lots.filter(l => l.speciesKey === sp.key);
    if (spLots.length === 0) return;

    const isCollapsed = collapsedSpecies[sp.key];
    const statusOrder = { perished: 0, overripe: 1, ready: 2, toosmall: 3 };
    const bc = { toosmall: 'pill-toosmall', ready: 'pill-ready', overripe: 'pill-overripe', perished: 'pill-perished' };
    const bl = { toosmall: 'Trop-petits', ready: 'Prêts', overripe: 'Trop gros', perished: 'À sortir' };

    const statusCounts = {};
    spLots.forEach(l => { const s = getStatus(l); statusCounts[s] = (statusCounts[s] || 0) + 1; });
    const badges = Object.entries(statusCounts)
      .map(([s, c]) => `<span class="mini-badge ${bc[s]}">${c} ${bl[s]}</span>`)
      .join('');

    const calKeys = [...new Set(spLots.map(l => `${sp.key}|${l.calibreKey}`))];
    const anyExpanded = calKeys.some(k => !collapsedCalibre[k]);

    html += `
      <div class="species-section ${isCollapsed ? 'collapsed' : ''}" id="sp-${sp.key}">
        <div class="species-header" onclick="toggleSpecies('${sp.key}')">
          <div class="species-color-bar" style="background:${sp.color}"></div>
          <div class="species-name">
            <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${sp.color};margin-right:7px;flex-shrink:0;vertical-align:middle"></span>
            ${sp.name}<span class="species-latin">${sp.latin}</span>
          </div>
          <div class="species-badges">${badges}</div>
          <button class="collapse-all-btn" onclick="event.stopPropagation();toggleAllCalibres('${sp.key}')">
            ${anyExpanded ? 'Réduire tout' : 'Déplier tout'}
          </button>
          <svg class="chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 6l4 4 4-4"/>
          </svg>
        </div>
        <div class="species-body">
    `;

    CALIBRES.forEach(cal => {
      const calLots = spLots.filter(l => l.calibreKey === cal.key);
      if (calLots.length === 0) return;

      const calKey = `${sp.key}|${cal.key}`;
      const isCalCollapsed = collapsedCalibre[calKey];
      const typeColor = cal.type === 'entier' ? '#0ea5e9' : '#7c3aed';
      const sortedLots = [...calLots].sort((a, b) => statusOrder[getStatus(a)] - statusOrder[getStatus(b)]);

      html += renderCalibreBlock(sp, cal, calKey, isCalCollapsed, typeColor, sortedLots);
    });

    html += `
        <div class="add-lot-row">
          <button class="add-lot-btn" onclick="openModal('${sp.key}', null)">
            <span style="font-size:15px;line-height:1;margin-right:2px">+</span>
            Ajouter un lot de <strong style="margin-left:3px">${sp.name}</strong>
          </button>
        </div>
      </div>
    </div>`;
  });

  container.innerHTML = html;
}

// ================================================================
// BLOC CALIBRE
// ================================================================
function renderCalibreBlock(sp, cal, calKey, isCalCollapsed, typeColor, sortedLots) {
  let html = `
    <div class="calibre-row ${isCalCollapsed ? 'collapsed' : ''}" id="cal-${calKey.replace('|', '-')}">
      <div class="calibre-header" onclick="toggleCalibre('${calKey}')">
        <span class="cal-type-tag ${cal.type}" style="background:${typeColor};color:white;font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px">
          ${cal.type === 'entier' ? 'E' : 'F'}
        </span>
        <span class="calibre-tag">${cal.label}</span>
        <svg class="calibre-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 6l4 4 4-4"/>
        </svg>
      </div>
      <div class="calibre-body">
        <table class="lot-table">
          <thead><tr>
            <th style="width:8%">Lot</th>
            <th style="width:8%">Quantité</th>
            <th style="width:22%">Poids actuel</th>
            <th style="width:11%">Prix de revient</th>
            <th style="width:11%">Prix de vente</th>
            <th style="width:21%">Marge estimée</th>
            <th style="width:11%">Statut</th>
            <th style="width:8%"></th>
          </tr></thead>
          <tbody>
  `;

  sortedLots.forEach(lot => {
    html += renderLotRow(lot, cal);
  });

  html += `</tbody></table></div></div>`;
  return html;
}

// ================================================================
// LIGNE DE LOT
// ================================================================
function renderLotRow(lot, cal) {
  const status = getStatus(lot);
  const val    = getValue(lot);
  const maxRef = cal.targetMax * 1.2;
  const fillPct   = Math.min(100, (lot.currentWeight / maxRef) * 100);
  const targetPct = Math.min(100, (cal.targetMin / maxRef) * 100);
  const maxPct    = Math.min(100, (cal.targetMax / maxRef) * 100);
  const statusLabels = { toosmall: 'Trop-petit', ready: 'Prêt', overripe: 'Trop gros', perished: 'À sortir' };
  const sliderData   = computeSliderGradientData(lot, cal);
  const marginTextColor = sliderData.cursorColor;
  const windowDates  = renderWindowDates(lot, status);

  return `
    <tr class="lot-row" data-lot-id="${lot.id}">
      <td>
        <div class="status-indicator">
          <div class="status-dot ${status}"></div>
          <span class="lot-name-cell">${lot.name}</span>
        </div>
      </td>
      <td><span class="mono" style="white-space:nowrap">${lot.quantity.toLocaleString('fr-FR')} kg</span></td>
      <td class="size-cell">
        <div class="size-info">
          <span class="mono" style="font-weight:500">${formatWeight(lot.currentWeight)}</span>
          <span style="color:var(--muted-light);font-family:'DM Mono',monospace;font-size:10px">${cal.targetMin}–${cal.targetMax} g</span>
        </div>
        <div class="size-bar-wrap">
          <div class="size-bar-fill ${status}" style="width:${fillPct}%"></div>
          <div class="size-target-marker" style="left:${targetPct}%"></div>
          <div class="size-target-marker" style="left:${maxPct}%;background:rgba(0,0,0,0.3)"></div>
        </div>
        ${windowDates}
      </td>
      <td><span class="mono" style="color:var(--muted);white-space:nowrap">${costAtWeight(lot.speciesKey, lot.currentWeight).toFixed(2)} €/kg</span></td>
      <td><span class="mono" style="white-space:nowrap">${lot.salePrice.toFixed(2)} €/kg</span></td>
      <td class="margin-cell">
        <div class="margin-header">
          <span class="margin-pct" style="color:${marginTextColor}">${val.marginPerKg >= 0 ? '+' : ''}${val.marginPerKg.toFixed(2)} €</span>
        </div>
        <div style="position:relative;height:6px;border-radius:3px;overflow:hidden;background:${sliderData.gradientCSS};max-width:120px">
          <div style="position:absolute;top:50%;transform:translate(-50%,-50%);left:${(sliderData.todayFraction * 100).toFixed(1)}%;width:8px;height:8px;border-radius:50%;background:${sliderData.cursorColor};border:1.5px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>
        </div>
      </td>
      <td><span class="status-pill pill-${status}">${statusLabels[status]}</span></td>
      <td style="text-align:right;padding-right:16px">
        <div style="display:flex;gap:6px;align-items:center;justify-content:flex-end">
          <button class="toremove-btn ${lot.toRemove ? 'active' : ''}" data-lot-id="${lot.id}" title="${lot.toRemove ? 'Retirer' : 'Marquer comme à sortir'}">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="${lot.toRemove ? '#dc2626' : 'currentColor'}" stroke-width="1.8" stroke-linecap="round">
              <circle cx="8" cy="8" r="6.5"/>
              <line x1="3.4" y1="8" x2="12.6" y2="8"/>
            </svg>
          </button>
          <button class="chart-btn" onclick="openChart(${lot.id})" title="Voir la courbe">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1,12 5,7 8,9 12,3 15,5"/>
              <line x1="1" y1="14" x2="15" y2="14"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderWindowDates(lot, status) {
  const w = getWindowDates(lot);
  if (!w) return '<div style="visibility:hidden"><div class="date-hint"><span class="date-dot"></span><span class="date-label">—</span></div></div>';

  let lines = '';
  if (w.readyDate) {
    lines += `<div class="date-hint"><span class="date-dot" style="background:var(--ready)"></span><span class="date-label">Prêt le</span><span class="date-val" style="color:var(--ready)">${w.readyDate}</span></div>`;
  } else {
    lines += `<div class="date-hint"><span class="date-dot" style="background:var(--ready)"></span><span class="date-label">Prêt</span><span class="date-val" style="color:var(--ready)">✓ maintenant</span></div>`;
  }
  if (w.maxDate) {
    lines += `<div class="date-hint"><span class="date-dot" style="background:var(--overripe)"></span><span class="date-label">Trop gros le</span><span class="date-val" style="color:var(--overripe)">${w.maxDate}</span></div>`;
  } else if (status === 'ready') {
    lines += `<div class="date-hint"><span class="date-dot" style="background:var(--overripe)"></span><span class="date-label">Trop gros</span><span class="date-val" style="color:var(--overripe)">dépassé</span></div>`;
  } else {
    lines += `<div class="date-hint" style="visibility:hidden"><span class="date-dot"></span><span class="date-label">—</span></div>`;
  }

  const hidden = status === 'perished';
  return `<div style="${hidden ? 'visibility:hidden' : ''}">${lines}</div>`;
}
