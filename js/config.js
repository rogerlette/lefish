/**
 * config.js
 * Modèles de croissance (Gompertz) et de coût.
 * Les espèces et calibres sont chargés depuis la base de données (voir data.js).
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
// ESPÈCES — Initialisées depuis la base de données (voir data.js)
// ================================================================
let SPECIES = [];

// ================================================================
// CALIBRES — Initialisés depuis la base de données (voir data.js)
// ================================================================
let CALIBRES = [];

// ================================================================
// DONNÉES PAR DÉFAUT (fallback si la base est indisponible)
// ================================================================
const DEFAULT_SPECIES = [
  {
    key: 'truite-arc',
    name: 'Truite Arc-en-ciel',
    latin: 'Oncorhynchus mykiss',
    color: '#0ea5e9',
    defaults: { costPrice: 7.80, salePrice: 9.50 },
    growthA: 4200, growthK: 0.0045,
    costHigh: 14.0, costMin: 6.2, costMature: 7.5, optimalWeight: 300,
  },
  {
    key: 'truite-fario',
    name: 'Truite Fario',
    latin: 'Salmo trutta fario',
    color: '#7c3aed',
    defaults: { costPrice: 11.20, salePrice: 13.00 },
    growthA: 2200, growthK: 0.0032,
    costHigh: 18.0, costMin: 9.5, costMature: 11.0, optimalWeight: 300,
  },
  {
    key: 'saumon-fontaine',
    name: 'Saumon de Fontaine',
    latin: 'Salvelinus fontinalis',
    color: '#f97316',
    defaults: { costPrice: 12.30, salePrice: 14.00 },
    growthA: 3000, growthK: 0.0038,
    costHigh: 18.0, costMin: 10.0, costMature: 12.0, optimalWeight: 300,
  },
  {
    key: 'omble',
    name: 'Omble Chevalier',
    latin: 'Salvelinus alpinus',
    color: '#0d9488',
    defaults: { costPrice: 16.20, salePrice: 18.00 },
    growthA: 3500, growthK: 0.0025,
    costHigh: 24.0, costMin: 13.5, costMature: 16.0, optimalWeight: 300,
  },
  {
    key: 'lavaret',
    name: 'Lavaret',
    latin: 'Coregonus lavaretus',
    color: '#6366f1',
    defaults: { costPrice: 9.30, salePrice: 11.00 },
    growthA: 1600, growthK: 0.0028,
    costHigh: 15.0, costMin: 7.8, costMature: 9.2, optimalWeight: 300,
  },
];

const DEFAULT_CALIBRES = [
  { key: 'e200400',   label: 'Entier 200/400',   type: 'entier', min: 200,  max: 400,  targetMin: 200,  targetMax: 400,  species: ['truite-arc', 'truite-fario', 'saumon-fontaine', 'lavaret'] },
  { key: 'e8001200',  label: 'Entier 800/1200',  type: 'entier', min: 800,  max: 1200, targetMin: 800,  targetMax: 1200, species: ['truite-arc', 'truite-fario', 'saumon-fontaine', 'omble', 'lavaret'] },
  { key: 'e15002500', label: 'Entier 1500/2500', type: 'entier', min: 1500, max: 2500, targetMin: 1500, targetMax: 2500, species: ['truite-arc', 'saumon-fontaine', 'omble'] },
  { key: 'e25003500', label: 'Entier 2500/3500', type: 'entier', min: 2500, max: 3500, targetMin: 2500, targetMax: 3500, species: ['truite-arc', 'saumon-fontaine'] },
  { key: 'f160200',   label: 'Filet 160/200',    type: 'filet',  min: 160,  max: 200,  targetMin: 160,  targetMax: 200,  species: ['truite-arc', 'truite-fario', 'lavaret'] },
  { key: 'f200400',   label: 'Filet 200/400',    type: 'filet',  min: 200,  max: 400,  targetMin: 200,  targetMax: 400,  species: ['truite-arc', 'truite-fario', 'saumon-fontaine'] },
  { key: 'f400600',   label: 'Filet 400/600',    type: 'filet',  min: 400,  max: 600,  targetMin: 400,  targetMax: 600,  species: ['truite-arc', 'saumon-fontaine', 'omble'] },
];

/**
 * Construit les tables de croissance et coût pour une espèce à partir de ses paramètres.
 */
function buildSpeciesTables(sp) {
  sp.growthTable = buildGrowthTable(sp.growthA, sp.growthK);
  sp.costTable   = buildCostTable(sp.costHigh, sp.costMin, sp.costMature, sp.optimalWeight);
  return sp;
}

/**
 * Initialise SPECIES à partir de données brutes (API ou fallback).
 */
function initSpeciesFromData(data) {
  SPECIES = data.map(sp => buildSpeciesTables({ ...sp }));
}

/**
 * Initialise CALIBRES à partir de données brutes (API ou fallback).
 */
function initCalibresFromData(data) {
  CALIBRES = data.map(c => ({ ...c }));
}
