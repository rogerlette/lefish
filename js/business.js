/**
 * business.js
 * Logique métier : statuts, marges, simulation de croissance, helpers de format.
 */

// ---- Lookups tables ----

function dailyGain(speciesKey, weightG) {
  const sp = SPECIES.find(s => s.key === speciesKey);
  if (!sp || !sp.growthTable) return 3;
  const idx = Math.min(500, Math.max(0, Math.round(weightG / 10)));
  return sp.growthTable[idx];
}

function costAtWeight(speciesKey, weightG) {
  const sp = SPECIES.find(s => s.key === speciesKey);
  if (!sp || !sp.costTable) return 0;
  const idx = Math.min(500, Math.max(0, Math.round(weightG / 10)));
  return sp.costTable[idx];
}

// ---- Statut ----

function getStatus(lot) {
  if (lot.toRemove) return 'perished';
  const cal = CALIBRES.find(c => c.key === lot.calibreKey);
  if (!cal) return 'toosmall';
  if (lot.currentWeight < cal.targetMin) return 'toosmall';
  if (lot.currentWeight <= cal.targetMax) return 'ready';
  return 'overripe';
}

// ---- Valeur / marge ----

function getValue(lot) {
  const s   = getStatus(lot);
  const cal = CALIBRES.find(c => c.key === lot.calibreKey);
  const cost          = costAtWeight(lot.speciesKey, lot.currentWeight);
  const marginPerKg   = lot.salePrice - cost;
  const effectiveSalePrice = lot.salePrice;
  const totalMargin   = marginPerKg * lot.quantity;

  let cursorPos = 0;
  if (s === 'perished') {
    cursorPos = 0;
  } else if (s === 'toosmall') {
    cursorPos = Math.min(59, (lot.currentWeight / (cal ? cal.targetMin : 1)) * 60);
  } else if (s === 'ready') {
    const win = cal.targetMax - cal.targetMin || 1;
    cursorPos = 60 + ((lot.currentWeight - cal.targetMin) / win) * 32;
  } else if (s === 'overripe') {
    const over = (lot.currentWeight - cal.targetMax) / (cal.targetMax * 0.15);
    cursorPos = 92 + Math.min(1, over) * 8;
  }
  cursorPos = Math.max(0, Math.min(100, cursorPos));

  return { effectiveSalePrice, marginPerKg, totalMargin, cursorPos };
}

// ---- Simulation vers un poids cible ----

function simulateDaysToWeight(lot, targetWeight) {
  if (lot.currentWeight >= targetWeight) return 0;
  let w = lot.currentWeight, days = 0;
  while (w < targetWeight && days < 3000) {
    w += dailyGain(lot.speciesKey, w);
    days++;
  }
  return days;
}

function getDaysToTarget(lot) {
  const cal = CALIBRES.find(c => c.key === lot.calibreKey);
  if (!cal || lot.currentWeight >= cal.targetMin) return 0;
  return simulateDaysToWeight(lot, cal.targetMin);
}

function getDaysToMax(lot) {
  const cal = CALIBRES.find(c => c.key === lot.calibreKey);
  if (!cal || lot.currentWeight >= cal.targetMax) return 0;
  return simulateDaysToWeight(lot, cal.targetMax);
}

function getWindowDates(lot) {
  const cal = CALIBRES.find(c => c.key === lot.calibreKey);
  if (!cal) return null;
  const daysToReady = getDaysToTarget(lot);
  const daysToMax   = getDaysToMax(lot);
  return {
    readyDate:  daysToReady > 0 ? addDays(daysToReady) : null,
    maxDate:    daysToMax   > 0 ? addDays(daysToMax)   : null,
    daysToReady,
    daysToMax,
  };
}

// ---- Format ----

function formatWeight(g) {
  if (g >= 1000) return (g / 1000).toFixed(2).replace('.', ',') + ' kg';
  return g + ' g';
}

// ---- Gradient slider (fidèle à l'aire du graphique popup) ----

function ratioToRGB(ratio) {
  let r, g, b;
  if (ratio < 0.5) {
    const t2 = ratio / 0.5;
    r = Math.round(220 - (220 - 234) * t2);
    g = Math.round(38  + (179 - 38)  * t2);
    b = Math.round(38  + (8   - 38)  * t2);
  } else {
    const t2 = (ratio - 0.5) / 0.5;
    r = Math.round(234 - (234 - 22)  * t2);
    g = Math.round(179 + (163 - 179) * t2);
    b = Math.round(8   + (74  - 8)   * t2);
  }
  return [r, g, b];
}

function computeSliderGradientData(lot, cal) {
  if (lot.toRemove) {
    return { gradientCSS: 'linear-gradient(to right, #cbd5e1, #94a3b8)', todayFraction: 0.5, cursorColor: '#64748b' };
  }

  const weightPast   = cal
    ? (lot.currentWeight < cal.targetMin ? lot.currentWeight * 0.70 : cal.targetMin * 0.70)
    : lot.currentWeight * 0.70;
  const weightFuture = cal
    ? (lot.currentWeight > cal.targetMax ? lot.currentWeight * 1.30 : cal.targetMax * 1.30)
    : lot.currentWeight * 1.30;

  const pastWeights = [];
  let w = lot.currentWeight;
  while (w > weightPast && w > 1 && pastWeights.length < 300) {
    w = Math.max(1, w - dailyGain(lot.speciesKey, w));
    pastWeights.unshift(w);
  }

  const futureWeights = [];
  w = lot.currentWeight;
  while (w < weightFuture && futureWeights.length < 300) {
    futureWeights.push(w);
    w = w + dailyGain(lot.speciesKey, w);
  }
  futureWeights.push(w);

  const allWeights = [...pastWeights, lot.currentWeight, ...futureWeights];
  const margins    = allWeights.map(ww => lot.salePrice - costAtWeight(lot.speciesKey, ww));
  const marginMin  = Math.min(...margins);
  const mrgRange   = (Math.max(...margins) - marginMin) || 1;

  const N = 16;
  const stops = [];
  for (let i = 0; i < N; i++) {
    const idx   = Math.round(i / (N - 1) * (allWeights.length - 1));
    const ratio = Math.max(0, Math.min(1, (margins[Math.min(idx, margins.length - 1)] - marginMin) / mrgRange));
    const [r, g, b] = ratioToRGB(ratio);
    stops.push(`rgba(${r},${g},${b},0.9) ${(i / (N - 1) * 100).toFixed(0)}%`);
  }

  const todayIdx      = pastWeights.length;
  const todayFraction = Math.max(0, Math.min(1, todayIdx / (allWeights.length - 1)));
  const todayMargin   = lot.salePrice - costAtWeight(lot.speciesKey, lot.currentWeight);
  const todayRatio    = Math.max(0, Math.min(1, (todayMargin - marginMin) / mrgRange));
  const [cr, cg, cb] = ratioToRGB(todayRatio);

  return {
    gradientCSS:  `linear-gradient(to right, ${stops.join(', ')})`,
    todayFraction,
    cursorColor:  `rgb(${cr},${cg},${cb})`,
  };
}
