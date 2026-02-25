/**
 * config.js
 * Modèles de croissance (Gompertz) et de coût, données espèces et calibres.
 */

// ================================================================
// MODÈLE DE CROISSANCE — Gompertz pondéral
// W(t) = A · exp(−exp(−k·(t−T)))
// dW/dt = k · W · ln(A/W) → gain journalier selon poids courant
// Retourne 501 valeurs : growthTable[i] = g/j pour poids = i×10 g
// Sources : Dumas et al. (2007) Aquaculture ; Janampa-Sarmiento et al. (2020)
// ================================================================
function buildGrowthTable(A, k) {
  const table = [];
  for (let i = 0; i <= 500; i++) {
    const w = Math.max(1, i * 10);
    const gain = k * w * Math.log(A / w);
    table.push(Math.max(0.05, parseFloat(Math.min(gain, 30).toFixed(3))));
  }
  return table;
}

// ================================================================
// MODÈLE DE COÛT — Prix de revient (€/kg) selon le poids vif
// Courbe en U : décroissance rapide puis remontée douce après le minimum
// Ref : ITAVI / pisciculture FR
// ================================================================
function buildCostTable(costHigh, costMin, costMature, optimalWeight) {
  const table = [];
  for (let i = 0; i <= 500; i++) {
    const w = Math.max(10, i * 10);
    const down = (costHigh - costMin) * Math.exp(-4.5 * w / optimalWeight);
    const up   = (costMature - costMin) * (1 - Math.exp(-1.8 * w / optimalWeight));
    const cost = costMin + down + up * Math.max(0, (w - optimalWeight * 0.6) / (5000 - optimalWeight * 0.6));
    table.push(Math.max(0.1, parseFloat(cost.toFixed(3))));
  }
  return table;
}

// ================================================================
// ESPÈCES
// ================================================================
const SPECIES = [
  {
    key: 'truite-arc',
    name: 'Truite Arc-en-ciel',
    latin: 'Oncorhynchus mykiss',
    color: '#0ea5e9',
    defaults: { costPrice: 7.80, salePrice: 9.50 },
    growthTable: buildGrowthTable(4200, 0.0045),
    costTable: buildCostTable(14.0, 6.2, 7.5, 300),
  },
  {
    key: 'truite-fario',
    name: 'Truite Fario',
    latin: 'Salmo trutta fario',
    color: '#7c3aed',
    defaults: { costPrice: 11.20, salePrice: 13.00 },
    growthTable: buildGrowthTable(2200, 0.0032),
    costTable: buildCostTable(18.0, 9.5, 11.0, 300),
  },
  {
    key: 'saumon-fontaine',
    name: 'Saumon de Fontaine',
    latin: 'Salvelinus fontinalis',
    color: '#f97316',
    defaults: { costPrice: 12.30, salePrice: 14.00 },
    growthTable: buildGrowthTable(3000, 0.0038),
    costTable: buildCostTable(18.0, 10.0, 12.0, 300),
  },
  {
    key: 'omble',
    name: 'Omble Chevalier',
    latin: 'Salvelinus alpinus',
    color: '#0d9488',
    defaults: { costPrice: 16.20, salePrice: 18.00 },
    growthTable: buildGrowthTable(3500, 0.0025),
    costTable: buildCostTable(24.0, 13.5, 16.0, 300),
  },
  {
    key: 'lavaret',
    name: 'Lavaret',
    latin: 'Coregonus lavaretus',
    color: '#6366f1',
    defaults: { costPrice: 9.30, salePrice: 11.00 },
    growthTable: buildGrowthTable(1600, 0.0028),
    costTable: buildCostTable(15.0, 7.8, 9.2, 300),
  },
];

// ================================================================
// CALIBRES
// ================================================================
let CALIBRES = [
  { key: 'e200400',   label: 'Entier 200/400',   type: 'entier', min: 200,  max: 400,  targetMin: 200,  targetMax: 400,  species: ['truite-arc', 'truite-fario', 'saumon-fontaine', 'lavaret'] },
  { key: 'e8001200',  label: 'Entier 800/1200',  type: 'entier', min: 800,  max: 1200, targetMin: 800,  targetMax: 1200, species: ['truite-arc', 'truite-fario', 'saumon-fontaine', 'omble', 'lavaret'] },
  { key: 'e15002500', label: 'Entier 1500/2500', type: 'entier', min: 1500, max: 2500, targetMin: 1500, targetMax: 2500, species: ['truite-arc', 'saumon-fontaine', 'omble'] },
  { key: 'e25003500', label: 'Entier 2500/3500', type: 'entier', min: 2500, max: 3500, targetMin: 2500, targetMax: 3500, species: ['truite-arc', 'saumon-fontaine'] },
  { key: 'f160200',   label: 'Filet 160/200',    type: 'filet',  min: 160,  max: 200,  targetMin: 160,  targetMax: 200,  species: ['truite-arc', 'truite-fario', 'lavaret'] },
  { key: 'f200400',   label: 'Filet 200/400',    type: 'filet',  min: 200,  max: 400,  targetMin: 200,  targetMax: 400,  species: ['truite-arc', 'truite-fario', 'saumon-fontaine'] },
  { key: 'f400600',   label: 'Filet 400/600',    type: 'filet',  min: 400,  max: 600,  targetMin: 400,  targetMax: 600,  species: ['truite-arc', 'saumon-fontaine', 'omble'] },
];
