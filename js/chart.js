/**
 * chart.js
 * Graphique popup : courbe de poids + prix de revient/vente + aire de marge.
 * Graphiques de l'éditeur de croissance (Gompertz) et de coût.
 */

// ================================================================
// GRAPHIQUE LOT (popup)
// ================================================================
function openChart(id) {
  const lot = lots.find(l => l.id === id);
  if (!lot) return;
  const cal = CALIBRES.find(c => c.key === lot.calibreKey);
  const sp  = SPECIES.find(s => s.key === lot.speciesKey);
  document.getElementById('chartTitle').textContent    = `${lot.name} — ${sp ? sp.name : ''}`;
  document.getElementById('chartSubtitle').textContent = cal ? `Calibre ${cal.label}` : '';
  document.getElementById('chartOverlay').classList.add('active');
  requestAnimationFrame(() => drawChart(lot, cal));
}

function closeChart() {
  document.getElementById('chartOverlay').classList.remove('active');
}

function drawChart(lot, cal) {
  const canvas = document.getElementById('chartCanvas');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth, H = canvas.offsetHeight || 340;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const padL = 62, padR = 52, padTop = 20, padMid = 12, padBot = 38;
  const totalH = H - padTop - padBot - padMid;
  const chW = Math.round(totalH * 0.45);
  const chP = totalH - chW;
  const cw  = W - padL - padR;

  const yTopW = padTop;
  const yBotW = yTopW + chW;
  const yTopP = yBotW + padMid;
  const yBotP = yTopP + chP;

  const sp = SPECIES.find(s => s.key === lot.speciesKey);

  // ── 1. Simulation passé ──
  const weightPast = cal
    ? (lot.currentWeight < cal.targetMin ? lot.currentWeight * 0.70 : cal.targetMin * 0.70)
    : lot.currentWeight * 0.70;
  const pastPts = [];
  let wBack = lot.currentWeight, dayBack = 0;
  while (wBack > weightPast && wBack > 1 && dayBack < 1200) {
    wBack = Math.max(1, parseFloat((wBack - dailyGain(lot.speciesKey, wBack)).toFixed(2)));
    dayBack++;
    pastPts.unshift({ dayOffset: -dayBack, weight: wBack });
  }

  // ── 2. Simulation futur ──
  const weightFuture = cal
    ? (lot.currentWeight > cal.targetMax ? lot.currentWeight * 1.30 : cal.targetMax * 1.30)
    : lot.currentWeight * 1.30;
  const futurePts = [];
  let wFwd = lot.currentWeight, dayFwd = 0;
  while (wFwd < weightFuture && dayFwd < 1200) {
    futurePts.push({ dayOffset: dayFwd, weight: wFwd });
    wFwd = parseFloat((wFwd + dailyGain(lot.speciesKey, wFwd)).toFixed(2));
    dayFwd++;
  }
  futurePts.push({ dayOffset: dayFwd, weight: wFwd });

  // ── 3. Fusion ──
  let ageDays = 0;
  { let wAge = lot.currentWeight;
    while (wAge > 1 && ageDays < 3000) {
      wAge = Math.max(1, parseFloat((wAge - dailyGain(lot.speciesKey, wAge)).toFixed(2)));
      ageDays++;
    }
  }
  const graphStartAge = ageDays - dayBack;

  const allRaw = [
    ...pastPts.map((p, i) => ({ day: graphStartAge + i, weight: p.weight })),
    ...futurePts.map(p => ({ day: graphStartAge + dayBack + p.dayOffset, weight: p.weight })),
  ];
  const seen = new Set();
  const allPts = allRaw
    .filter(p => { if (seen.has(p.day)) return false; seen.add(p.day); return true; })
    .sort((a, b) => a.day - b.day);

  const todayDay = graphStartAge + dayBack;
  const pts = allPts.map(p => ({
    month:   p.day / 30.44,
    day:     p.day,
    weight:  p.weight,
    saleEff: lot.salePrice,
    cost:    costAtWeight(lot.speciesKey, p.weight),
  }));

  if (pts.length === 0) return;

  const todayMonth     = todayDay / 30.44;
  const displayMonths  = pts[pts.length - 1].month;
  const startMonth     = pts[0].month;
  const xOf = m => padL + ((m - startMonth) / (displayMonths - startMonth)) * cw;

  const findMonth = tw => { const p = pts.find(p => p.weight >= tw); return p ? p.month : displayMonths; };
  const mMin = cal ? findMonth(cal.targetMin) : todayMonth;
  const mMax = cal ? findMonth(cal.targetMax) : displayMonths;
  const mPer = cal ? findMonth(cal.targetMax * 1.15) : displayMonths;

  const maxW     = Math.max(...pts.map(p => p.weight));
  const wScaleMax = Math.ceil(maxW / 500) * 500;
  const wStep     = wScaleMax <= 1000 ? 200 : wScaleMax <= 3000 ? 500 : 1000;
  const yOfW      = w => yTopW + chW - (Math.min(w, wScaleMax) / wScaleMax) * chW;

  const allCosts   = pts.map(p => p.cost);
  const pPriceMin  = Math.max(0, Math.min(...allCosts, lot.salePrice) - 0.5);
  const pPriceMax  = Math.max(...allCosts, lot.salePrice) + 0.8;
  const pPriceRange = pPriceMax - pPriceMin || 1;
  const yOfP       = v => yTopP + chP - ((v - pPriceMin) / pPriceRange) * chP;

  const margins   = pts.map(p => p.saleEff - p.cost);
  const marginMax = Math.max(...margins);
  const marginMin = Math.min(...margins);
  const mrgRange  = (marginMax - marginMin) || 1;

  const spColor = sp ? sp.color : '#0ea5e9';
  const xToday  = xOf(todayMonth);

  // ── Bandeaux statut ──
  const zones = [
    { from: startMonth, to: mMin,         fill: 'rgba(37,99,235,0.07)',   label: 'Trop petit', color: '#2563eb' },
    { from: mMin,       to: mMax,         fill: 'rgba(22,163,74,0.09)',   label: 'Prêt',       color: '#16a34a' },
    { from: mMax,       to: displayMonths, fill: 'rgba(217,119,6,0.09)', label: 'Trop gros',  color: '#d97706' },
  ];
  zones.forEach(z => {
    if (z.from >= z.to) return;
    const x1 = xOf(Math.max(z.from, startMonth)), x2 = xOf(Math.min(z.to, displayMonths));
    if (x2 <= x1) return;
    ctx.fillStyle = z.fill;
    ctx.fillRect(x1, yTopW, x2 - x1, chW);
    ctx.fillRect(x1, yTopP, x2 - x1, chP);
    const visFrom = Math.max(z.from, todayMonth), visTo = Math.min(z.to, displayMonths);
    if (visTo > visFrom && xOf(visTo) - xOf(visFrom) > 30) {
      ctx.save();
      ctx.fillStyle = z.color; ctx.globalAlpha = 0.6;
      ctx.font = '600 9px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(z.label, (xOf(visFrom) + xOf(visTo)) / 2, yTopW + 13);
      ctx.restore();
    }
  });

  // Voile passé
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillRect(padL, yTopW, xToday - padL, chW);
  ctx.fillRect(padL, yTopP, xToday - padL, chP);

  // Séparateurs de zones
  [mMin, mMax, mPer].forEach(m => {
    if (m <= startMonth || m >= displayMonths) return;
    ctx.save(); ctx.setLineDash([4, 3]);
    ctx.strokeStyle = m <= todayMonth ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xOf(m), yTopW); ctx.lineTo(xOf(m), yBotP); ctx.stroke();
    ctx.restore();
  });

  // Grilles
  ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.lineWidth = 1;
  for (let wv = 0; wv <= wScaleMax; wv += wStep) {
    const y = yOfW(wv);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cw, y); ctx.stroke();
  }
  for (let i = 0; i <= 4; i++) {
    const y = yTopP + (chP / 4) * i;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cw, y); ctx.stroke();
  }

  // ── Panneau 1 : courbe de poids ──
  ctx.beginPath();
  ctx.moveTo(xOf(pts[0].month), yBotW);
  pts.forEach(p => ctx.lineTo(xOf(p.month), yOfW(p.weight)));
  ctx.lineTo(xOf(pts[pts.length - 1].month), yBotW);
  ctx.closePath();
  ctx.fillStyle = spColor + '1a'; ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = spColor; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(xOf(p.month), yOfW(p.weight)) : ctx.lineTo(xOf(p.month), yOfW(p.weight)));
  ctx.stroke();

  const todayPtW = pts.reduce((b, p) => Math.abs(p.month - todayMonth) < Math.abs(b.month - todayMonth) ? p : b, pts[0]);
  ctx.beginPath(); ctx.arc(xToday, yOfW(todayPtW.weight), 5, 0, Math.PI * 2);
  ctx.fillStyle = 'white'; ctx.fill();
  ctx.strokeStyle = spColor; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = '600 9.5px Inter, sans-serif'; ctx.fillStyle = spColor; ctx.textAlign = 'center';
  ctx.fillText(formatWeight(Math.round(todayPtW.weight)), xToday, yOfW(todayPtW.weight) - 9);

  // ── Panneau 2 : prix + aire marge ──
  const ySaleFix = yOfP(lot.salePrice);

  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(xOf(p.month), yOfP(p.cost)) : ctx.lineTo(xOf(p.month), yOfP(p.cost)));
  ctx.lineTo(xOf(pts[pts.length - 1].month), ySaleFix);
  ctx.lineTo(xOf(pts[0].month), ySaleFix);
  ctx.closePath();

  const gFill = ctx.createLinearGradient(padL, 0, padL + cw, 0);
  pts.forEach(p => {
    const t = (p.month - startMonth) / (displayMonths - startMonth);
    const ratio = Math.max(0, Math.min(1, (p.saleEff - p.cost - marginMin) / mrgRange));
    const [r, g, b] = ratioToRGB(ratio);
    gFill.addColorStop(Math.max(0, Math.min(1, t)), `rgba(${r},${g},${b},0.25)`);
  });
  ctx.fillStyle = gFill; ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(xOf(p.month), yOfP(p.cost)) : ctx.lineTo(xOf(p.month), yOfP(p.cost)));
  ctx.stroke();

  ctx.beginPath(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2;
  ctx.moveTo(padL, ySaleFix); ctx.lineTo(padL + cw, ySaleFix); ctx.stroke();

  ctx.fillStyle = '#4b5563'; ctx.font = '500 9px Inter, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('Revient ' + pts[pts.length - 1].cost.toFixed(2) + ' €', padL + 4, yOfP(pts[pts.length - 1].cost) - 4);
  ctx.fillStyle = '#7c3aed'; ctx.textAlign = 'right';
  ctx.fillText('Vente ' + lot.salePrice.toFixed(2) + ' €/kg', padL + cw - 2, ySaleFix - 4);

  ctx.textAlign = 'left'; ctx.font = '10px DM Mono, monospace';
  for (let i = 0; i <= 4; i++) {
    const pv     = pPriceMin + (pPriceRange / 4) * i;
    const margin = lot.salePrice - pv;
    ctx.fillStyle = margin >= 0 ? '#16a34a' : '#dc2626';
    ctx.fillText((margin >= 0 ? '+' : '') + margin.toFixed(2) + ' €', padL + cw + 4, yOfP(pv) + 3.5);
  }
  ctx.save(); ctx.translate(W - 10, yTopP + chP / 2); ctx.rotate(Math.PI / 2);
  ctx.fillStyle = '#b5b2aa'; ctx.font = '8.5px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Marge (€/kg)', 0, 0); ctx.restore();

  // Sweet spot
  const sweetPt  = pts.reduce((b, p) => (p.saleEff - p.cost) > (b.saleEff - b.cost) ? p : b, pts[0]);
  const sx = xOf(sweetPt.month), sy = yOfP(sweetPt.cost);
  ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(245,158,11,0.18)'; ctx.fill();
  ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b'; ctx.fill();
  ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.stroke();
  const sweetMargin   = (sweetPt.saleEff - sweetPt.cost).toFixed(2);
  const daysFromToday = Math.round((sweetPt.month - todayMonth) * 30.44);
  const sweetLabel    = `Pic +${sweetMargin} €/kg  ·  ${addDays(daysFromToday)}  ·  ${formatWeight(Math.round(sweetPt.weight))}`;
  ctx.font = '500 9px Inter, sans-serif'; ctx.fillStyle = '#92400e';
  const lw = ctx.measureText(sweetLabel).width;
  const lx = Math.min(Math.max(padL, sx - lw / 2), padL + cw - lw);
  ctx.textAlign = 'left';
  ctx.fillText(sweetLabel, lx, sy > yTopP + 18 ? sy - 6 : sy + 16);

  // Ligne aujourd'hui
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(xToday, yTopW); ctx.lineTo(xToday, yBotP); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.font = '600 8.5px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText("Aujourd'hui", xToday, yTopW + 10);

  // Axes
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
  [[yTopW, yBotW], [yTopP, yBotP]].forEach(([t, b]) => {
    ctx.beginPath();
    ctx.moveTo(padL, t); ctx.lineTo(padL, b);
    ctx.moveTo(padL, b); ctx.lineTo(padL + cw, b);
    ctx.stroke();
  });

  // Axe X
  const monthStep = displayMonths <= 8 ? 1 : displayMonths <= 14 ? 2 : displayMonths <= 24 ? 3 : 6;
  ctx.fillStyle = '#7a7770'; ctx.font = '10px DM Mono, monospace'; ctx.textAlign = 'center';
  const firstTick = Math.ceil(startMonth / monthStep) * monthStep;
  for (let m = firstTick; m <= Math.ceil(displayMonths); m += monthStep) {
    const x = xOf(m);
    if (x < padL || x > padL + cw) continue;
    ctx.fillText(Math.round(m) + ' m', x, yBotP + 14);
  }

  // Axe Y gauche — poids
  ctx.textAlign = 'right'; ctx.fillStyle = spColor; ctx.font = '10px DM Mono, monospace';
  for (let wv = 0; wv <= wScaleMax; wv += wStep) {
    const label = wv === 0 ? '0' : wv < 1000 ? wv + 'g' : (wv / 1000).toFixed(wv < 2000 ? 1 : 0) + 'kg';
    ctx.fillText(label, padL - 5, yOfW(wv) + 3.5);
  }
  ctx.save(); ctx.translate(11, yTopW + chW / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#b5b2aa'; ctx.font = '8.5px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Poids vif', 0, 0); ctx.restore();

  // Axe Y gauche — prix
  ctx.textAlign = 'right'; ctx.fillStyle = '#7a7770'; ctx.font = '10px DM Mono, monospace';
  for (let i = 0; i <= 4; i++) {
    const pv = pPriceMin + (pPriceRange / 4) * i;
    ctx.fillText(pv.toFixed(2) + ' €', padL - 5, yOfP(pv) + 3.5);
  }
  ctx.save(); ctx.translate(11, yTopP + chP / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#b5b2aa'; ctx.font = '8.5px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Prix (€/kg)', 0, 0); ctx.restore();

  // Légende
  const legItems = [
    { color: spColor,   label: 'Poids vif' },
    { color: '#4b5563', label: 'Prix de revient' },
    { color: '#7c3aed', label: 'Prix de vente' },
    { color: '#f59e0b', dot: true, label: 'Pic de marge' },
  ];
  let legX = padL + cw - 4, legY = yTopW + 14;
  legItems.forEach(item => {
    ctx.textAlign = 'right'; ctx.fillStyle = '#7a7770'; ctx.font = '9px Inter, sans-serif';
    ctx.fillText(item.label, legX - 18, legY);
    if (item.dot) {
      ctx.beginPath(); ctx.arc(legX - 6, legY - 3.5, 4, 0, Math.PI * 2);
      ctx.fillStyle = item.color; ctx.fill();
      ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.stroke();
    } else {
      ctx.strokeStyle = item.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(legX - 14, legY - 3.5); ctx.lineTo(legX, legY - 3.5); ctx.stroke();
    }
    legY += 14;
  });
}

// ================================================================
// ÉDITEUR CROISSANCE — graphique Gompertz
// ================================================================
let activeGrowthSpeciesKey = null;
let activeGrowthMode = 'growth'; // 'growth' | 'cost'

function setGrowthMode(mode) {
  activeGrowthMode = mode;
  document.getElementById('modeGrowthBtn').classList.toggle('active', mode === 'growth');
  document.getElementById('modeCostBtn').classList.toggle('active', mode === 'cost');
  document.getElementById('growthCanvas').style.display = mode === 'growth' ? 'block' : 'none';
  document.getElementById('costCanvas').style.display   = mode === 'cost'   ? 'block' : 'none';
  document.getElementById('growthEditorSubtitle').textContent = mode === 'growth'
    ? 'Gain de poids journalier (g/jour) selon le poids vif (g)'
    : 'Prix de revient (€/kg) selon le poids vif (g)';
  renderGrowthTable();
  if (mode === 'growth') drawGrowthChart(); else drawCostChart();
}

function openGrowthEditor() {
  activeGrowthSpeciesKey = SPECIES[0].key;
  activeGrowthMode = 'growth';
  setGrowthMode('growth');
  renderGrowthTabs();
  renderGrowthTable();
  document.getElementById('growthOverlay').classList.add('active');
  requestAnimationFrame(() => drawGrowthChart());
}

function closeGrowthEditor() {
  document.getElementById('growthOverlay').classList.remove('active');
}

function renderGrowthTabs() {
  const wrap = document.getElementById('growthTabs');
  wrap.innerHTML = SPECIES.map(sp => {
    const active = sp.key === activeGrowthSpeciesKey;
    return `<button class="growth-tab ${active ? 'active' : ''}"
      style="${active ? `background:${sp.color};border-color:${sp.color}` : ''}"
      onclick="selectGrowthSpecies('${sp.key}')">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${active ? 'white' : sp.color};margin-right:5px;vertical-align:middle"></span>
      ${sp.name}</button>`;
  }).join('');
}

function selectGrowthSpecies(key) {
  activeGrowthSpeciesKey = key;
  renderGrowthTabs();
  renderGrowthTable();
  if (activeGrowthMode === 'growth') drawGrowthChart(); else drawCostChart();
}

function renderGrowthTable() {
  const sp = SPECIES.find(s => s.key === activeGrowthSpeciesKey);
  if (!sp) return;
  const isGrowth  = activeGrowthMode === 'growth';
  const data      = isGrowth ? sp.growthTable : sp.costTable;
  const colLabel  = isGrowth ? 'Gain/j (g)' : 'Coût (€/kg)';
  const COLS      = 4;

  document.getElementById('growthTableHead').innerHTML = [0, 1, 2, 3].map(() =>
    `<th>Poids (g)</th><th>${colLabel}</th>`
  ).join('');

  const rowCount = Math.ceil(501 / COLS);
  let rows = '';
  for (let r = 0; r < rowCount; r++) {
    rows += '<tr>';
    for (let c = 0; c < COLS; c++) {
      const i = c * rowCount + r;
      if (i <= 500) {
        const w   = i * 10;
        const val = data[i];
        const fn  = isGrowth ? 'updateGrowthValue' : 'updateCostValue';
        rows += `<td>${w}</td><td><input type="number" value="${val.toFixed(2)}" min="0" max="${isGrowth ? '50' : '100'}" step="0.01" onchange="${fn}('${sp.key}',${i},this.value)" onfocus="this.select()"></td>`;
      } else {
        rows += '<td></td><td></td>';
      }
    }
    rows += '</tr>';
  }
  document.getElementById('growthTableBody').innerHTML = rows;
}

function updateGrowthValue(speciesKey, idx, val) {
  const sp = SPECIES.find(s => s.key === speciesKey);
  if (!sp) return;
  const v = parseFloat(val);
  if (!isNaN(v) && v >= 0) { sp.growthTable[idx] = parseFloat(v.toFixed(3)); drawGrowthChart(); }
}

function updateCostValue(speciesKey, idx, val) {
  const sp = SPECIES.find(s => s.key === speciesKey);
  if (!sp) return;
  const v = parseFloat(val);
  if (!isNaN(v) && v >= 0) { sp.costTable[idx] = parseFloat(v.toFixed(3)); drawCostChart(); }
}

function drawGrowthChart() {
  const sp = SPECIES.find(s => s.key === activeGrowthSpeciesKey);
  if (!sp) return;
  const canvas = document.getElementById('growthCanvas');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 840, H = 220;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const pad = { top: 22, right: 28, bottom: 44, left: 58 };
  const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;

  const targetW = (() => {
    for (let i = 490; i >= 1; i--) { if (sp.growthTable[i] > 0.1) return i * 10; }
    return 4000;
  })();

  const points = [];
  let w = 1, day = 0;
  while (w < targetW && day < 1500) {
    points.push({ day, month: day / 30.44, weight: w });
    const idx = Math.min(500, Math.max(0, Math.round(w / 10)));
    w = Math.min(targetW + 100, w + sp.growthTable[idx]);
    day++;
  }
  points.push({ day, month: day / 30.44, weight: w });

  const totalMonths  = day / 30.44;
  const maxWeight    = Math.ceil(targetW / 500) * 500;
  const displayMonths = Math.ceil(totalMonths / 6) * 6;

  const xOf = m => pad.left + (m / displayMonths) * cw;
  const yOf = w => pad.top + ch - (Math.min(w, maxWeight) / maxWeight) * ch;

  const yStep = maxWeight <= 2000 ? 500 : 1000;
  ctx.strokeStyle = 'rgba(0,0,0,0.055)'; ctx.lineWidth = 1;
  for (let wv = 0; wv <= maxWeight; wv += yStep) {
    const y = yOf(wv); ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
  }
  for (let m = 0; m <= displayMonths; m += 6) {
    const x = xOf(m); ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + ch); ctx.stroke();
  }

  ctx.beginPath(); ctx.moveTo(xOf(points[0].month), pad.top + ch);
  points.forEach(p => ctx.lineTo(xOf(p.month), yOf(p.weight)));
  ctx.lineTo(xOf(points[points.length - 1].month), pad.top + ch);
  ctx.closePath();
  ctx.fillStyle = sp.color + '1a'; ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = sp.color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  points.forEach((p, i) => i === 0 ? ctx.moveTo(xOf(p.month), yOf(p.weight)) : ctx.lineTo(xOf(p.month), yOf(p.weight)));
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + ch);
  ctx.moveTo(pad.left, pad.top + ch); ctx.lineTo(pad.left + cw, pad.top + ch);
  ctx.stroke();

  ctx.fillStyle = '#7a7770'; ctx.font = '10px DM Mono, monospace'; ctx.textAlign = 'center';
  for (let m = 0; m <= displayMonths; m += 6) {
    ctx.fillText(m + ' m', xOf(m), pad.top + ch + 14);
  }
  ctx.fillStyle = '#b5b2aa'; ctx.font = '9px Inter, sans-serif';
  ctx.fillText('Âge (mois)', pad.left + cw / 2, pad.top + ch + 30);

  ctx.textAlign = 'right'; ctx.fillStyle = sp.color; ctx.font = '10px DM Mono, monospace';
  for (let wv = 0; wv <= maxWeight; wv += yStep) {
    const label = wv < 1000 ? wv + 'g' : (wv / 1000) + 'kg';
    ctx.fillText(label, pad.left - 5, yOf(wv) + 3.5);
  }
  ctx.save(); ctx.translate(11, pad.top + ch / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#b5b2aa'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Poids vif (g)', 0, 0); ctx.restore();
}

function drawCostChart() {
  const sp = SPECIES.find(s => s.key === activeGrowthSpeciesKey);
  if (!sp) return;
  const canvas = document.getElementById('costCanvas');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 840, H = 220;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const pad = { top: 20, right: 28, bottom: 42, left: 62 };
  const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;

  const table   = sp.costTable;
  const maxCost = Math.max(...table) * 1.1;
  const minCost = Math.max(0, Math.min(...table) - 0.5);
  const range   = maxCost - minCost || 1;
  const xOf = i => pad.left + (i / 500) * cw;
  const yOf = c => pad.top + ch - ((c - minCost) / range) * ch;

  ctx.strokeStyle = 'rgba(0,0,0,0.055)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (ch / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
  }
  [0, 100, 200, 300, 400, 500].forEach(i => {
    const x = xOf(i);
    ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + ch); ctx.stroke();
  });

  ctx.beginPath(); ctx.moveTo(xOf(0), pad.top + ch);
  table.forEach((c, i) => ctx.lineTo(xOf(i), yOf(c)));
  ctx.lineTo(xOf(500), pad.top + ch); ctx.closePath();
  ctx.fillStyle = '#f97316' + '1a'; ctx.fill();

  ctx.beginPath(); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  table.forEach((c, i) => i === 0 ? ctx.moveTo(xOf(i), yOf(c)) : ctx.lineTo(xOf(i), yOf(c)));
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + ch);
  ctx.moveTo(pad.left, pad.top + ch); ctx.lineTo(pad.left + cw, pad.top + ch);
  ctx.stroke();

  ctx.fillStyle = '#7a7770'; ctx.font = '10px DM Mono, monospace'; ctx.textAlign = 'center';
  [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000].forEach(w => {
    const i = w / 10; if (i > 500) return;
    ctx.fillText(w < 1000 ? w + 'g' : (w / 1000) + 'kg', xOf(i), pad.top + ch + 14);
  });
  ctx.fillStyle = '#b5b2aa'; ctx.font = '9px Inter, sans-serif';
  ctx.fillText('Poids vif (g)', pad.left + cw / 2, pad.top + ch + 30);

  ctx.textAlign = 'right'; ctx.fillStyle = '#f97316'; ctx.font = '10px DM Mono, monospace';
  for (let i = 0; i <= 4; i++) {
    const c = minCost + (range / 4) * i;
    ctx.fillText(c.toFixed(2) + ' €', pad.left - 6, yOf(c) + 3.5);
  }
  ctx.save(); ctx.translate(12, pad.top + ch / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#b5b2aa'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Prix de revient (€/kg)', 0, 0); ctx.restore();
}
