/**
 * data.js
 * Chargement des lots depuis l'API MySQL.
 * Fallback sur les données de démonstration si l'API n'est pas disponible.
 */

const API_BASE = 'api/lots.php';

// ── Données de démonstration (fallback si MySQL indisponible) ──
const DEMO_LOTS = [
  // Truite Arc-en-ciel
  { name: 'A1', speciesKey: 'truite-arc', calibreKey: 'e200400',   quantity: 620, currentWeight: 430,  costPrice: 7.80,  salePrice: 9.50  },
  { name: 'A2', speciesKey: 'truite-arc', calibreKey: 'e200400',   quantity: 480, currentWeight: 310,  costPrice: 7.80,  salePrice: 9.50  },
  { name: 'A3', speciesKey: 'truite-arc', calibreKey: 'e200400',   quantity: 390, currentWeight: 460,  costPrice: 7.80,  salePrice: 9.50  },
  { name: 'A4', speciesKey: 'truite-arc', calibreKey: 'e200400',   quantity: 310, currentWeight: 140,  costPrice: 7.80,  salePrice: 9.50  },
  { name: 'B1', speciesKey: 'truite-arc', calibreKey: 'e8001200',  quantity: 850, currentWeight: 980,  costPrice: 7.80,  salePrice: 9.50  },
  { name: 'B2', speciesKey: 'truite-arc', calibreKey: 'e8001200',  quantity: 490, currentWeight: 1100, costPrice: 7.80,  salePrice: 9.50  },
  { name: 'B3', speciesKey: 'truite-arc', calibreKey: 'e8001200',  quantity: 360, currentWeight: 1340, costPrice: 7.80,  salePrice: 9.50  },
  { name: 'B4', speciesKey: 'truite-arc', calibreKey: 'e8001200',  quantity: 700, currentWeight: 600,  costPrice: 7.80,  salePrice: 9.50  },
  { name: 'C1', speciesKey: 'truite-arc', calibreKey: 'e15002500', quantity: 280, currentWeight: 1800, costPrice: 8.10,  salePrice: 9.90  },
  { name: 'C2', speciesKey: 'truite-arc', calibreKey: 'e15002500', quantity: 200, currentWeight: 1100, costPrice: 8.10,  salePrice: 9.90  },
  { name: 'D1', speciesKey: 'truite-arc', calibreKey: 'f200400',   quantity: 300, currentWeight: 280,  costPrice: 9.50,  salePrice: 11.40 },
  { name: 'D2', speciesKey: 'truite-arc', calibreKey: 'f200400',   quantity: 180, currentWeight: 430,  costPrice: 9.50,  salePrice: 11.40 },
  { name: 'D3', speciesKey: 'truite-arc', calibreKey: 'f400600',   quantity: 220, currentWeight: 510,  costPrice: 9.80,  salePrice: 11.60 },
  // Truite Fario
  { name: 'F1', speciesKey: 'truite-fario', calibreKey: 'e200400',  quantity: 280, currentWeight: 250,  costPrice: 11.20, salePrice: 13.00 },
  { name: 'F2', speciesKey: 'truite-fario', calibreKey: 'e200400',  quantity: 190, currentWeight: 380,  costPrice: 11.20, salePrice: 13.00 },
  { name: 'F3', speciesKey: 'truite-fario', calibreKey: 'e200400',  quantity: 160, currentWeight: 460,  costPrice: 11.20, salePrice: 13.00 },
  { name: 'F4', speciesKey: 'truite-fario', calibreKey: 'e200400',  quantity: 220, currentWeight: 110,  costPrice: 11.20, salePrice: 13.00 },
  { name: 'G1', speciesKey: 'truite-fario', calibreKey: 'e8001200', quantity: 150, currentWeight: 950,  costPrice: 11.20, salePrice: 13.00 },
  { name: 'G2', speciesKey: 'truite-fario', calibreKey: 'e8001200', quantity: 120, currentWeight: 1150, costPrice: 11.20, salePrice: 13.00 },
  { name: 'G3', speciesKey: 'truite-fario', calibreKey: 'e8001200', quantity: 200, currentWeight: 500,  costPrice: 11.20, salePrice: 13.00 },
  { name: 'H1', speciesKey: 'truite-fario', calibreKey: 'f160200',  quantity: 100, currentWeight: 185,  costPrice: 13.10, salePrice: 15.00 },
  // Saumon de Fontaine
  { name: 'R1', speciesKey: 'saumon-fontaine', calibreKey: 'e8001200',  quantity: 410, currentWeight: 1050, costPrice: 12.30, salePrice: 14.00 },
  { name: 'R2', speciesKey: 'saumon-fontaine', calibreKey: 'e8001200',  quantity: 290, currentWeight: 870,  costPrice: 12.30, salePrice: 14.00 },
  { name: 'R3', speciesKey: 'saumon-fontaine', calibreKey: 'e8001200',  quantity: 350, currentWeight: 1340, costPrice: 12.30, salePrice: 14.00 },
  { name: 'R4', speciesKey: 'saumon-fontaine', calibreKey: 'e8001200',  quantity: 500, currentWeight: 580,  costPrice: 12.30, salePrice: 14.00 },
  { name: 'S1', speciesKey: 'saumon-fontaine', calibreKey: 'e15002500', quantity: 340, currentWeight: 1900, costPrice: 12.30, salePrice: 14.00 },
  { name: 'S2', speciesKey: 'saumon-fontaine', calibreKey: 'e15002500', quantity: 260, currentWeight: 2300, costPrice: 12.30, salePrice: 14.00 },
  { name: 'S3', speciesKey: 'saumon-fontaine', calibreKey: 'e15002500', quantity: 180, currentWeight: 2750, costPrice: 12.30, salePrice: 14.00 },
  { name: 'S4', speciesKey: 'saumon-fontaine', calibreKey: 'e15002500', quantity: 500, currentWeight: 900,  costPrice: 12.30, salePrice: 14.00 },
  { name: 'T1', speciesKey: 'saumon-fontaine', calibreKey: 'f400600',   quantity: 200, currentWeight: 490,  costPrice: 15.10, salePrice: 17.00 },
  { name: 'T2', speciesKey: 'saumon-fontaine', calibreKey: 'f400600',   quantity: 150, currentWeight: 650,  costPrice: 15.10, salePrice: 17.00 },
  // Omble Chevalier
  { name: 'N1', speciesKey: 'omble', calibreKey: 'e8001200',  quantity: 180, currentWeight: 950,  costPrice: 16.20, salePrice: 18.00 },
  { name: 'N2', speciesKey: 'omble', calibreKey: 'e8001200',  quantity: 140, currentWeight: 1100, costPrice: 16.20, salePrice: 18.00 },
  { name: 'N3', speciesKey: 'omble', calibreKey: 'e8001200',  quantity: 200, currentWeight: 600,  costPrice: 16.20, salePrice: 18.00 },
  { name: 'O1', speciesKey: 'omble', calibreKey: 'e15002500', quantity: 220, currentWeight: 1600, costPrice: 16.20, salePrice: 18.00 },
  { name: 'O2', speciesKey: 'omble', calibreKey: 'e15002500', quantity: 150, currentWeight: 2200, costPrice: 16.20, salePrice: 18.00 },
  { name: 'O3', speciesKey: 'omble', calibreKey: 'e15002500', quantity: 110, currentWeight: 2800, costPrice: 16.20, salePrice: 18.00 },
  { name: 'O4', speciesKey: 'omble', calibreKey: 'e15002500', quantity: 300, currentWeight: 900,  costPrice: 16.20, salePrice: 18.00 },
  { name: 'P1', speciesKey: 'omble', calibreKey: 'f200400',   quantity: 80,  currentWeight: 250,  costPrice: 20.10, salePrice: 22.00 },
  // Lavaret
  { name: 'L1', speciesKey: 'lavaret', calibreKey: 'e200400',  quantity: 460, currentWeight: 310,  costPrice: 9.30, salePrice: 11.00 },
  { name: 'L2', speciesKey: 'lavaret', calibreKey: 'e200400',  quantity: 310, currentWeight: 260,  costPrice: 9.30, salePrice: 11.00 },
  { name: 'L3', speciesKey: 'lavaret', calibreKey: 'e200400',  quantity: 200, currentWeight: 430,  costPrice: 9.30, salePrice: 11.00 },
  { name: 'L4', speciesKey: 'lavaret', calibreKey: 'e200400',  quantity: 380, currentWeight: 130,  costPrice: 9.30, salePrice: 11.00 },
  { name: 'M1', speciesKey: 'lavaret', calibreKey: 'e8001200', quantity: 250, currentWeight: 900,  costPrice: 9.30, salePrice: 11.00 },
  { name: 'M2', speciesKey: 'lavaret', calibreKey: 'e8001200', quantity: 180, currentWeight: 650,  costPrice: 9.30, salePrice: 11.00 },
  { name: 'K1', speciesKey: 'lavaret', calibreKey: 'f160200',  quantity: 200, currentWeight: 175,  costPrice: 11.50, salePrice: 13.30 },
  { name: 'K2', speciesKey: 'lavaret', calibreKey: 'f160200',  quantity: 140, currentWeight: 125,  costPrice: 11.50, salePrice: 13.30 },
];

// ── Flag : connecté à MySQL ou non ──
let dbConnected = false;

// ── Affichage de l'écran d'erreur ──
function showErrorScreen(message, detail) {
  const screen = document.getElementById('errorScreen');
  if (!screen) return;
  if (message) document.getElementById('errorMessage').textContent = message;
  if (detail)  document.getElementById('errorDetail').textContent = detail;
  screen.style.display = 'flex';
  // Masquer le contenu principal
  document.querySelector('header').style.display = 'none';
  document.getElementById('summaryBar').style.display = 'none';
  document.querySelector('main').style.display = 'none';
}

function hideErrorScreen() {
  const screen = document.getElementById('errorScreen');
  if (screen) screen.style.display = 'none';
  document.querySelector('header').style.display = '';
  document.getElementById('summaryBar').style.display = '';
  document.querySelector('main').style.display = '';
}

// ── Lancement du mode démo depuis l'écran d'erreur ──
function startDemoMode() {
  hideErrorScreen();
  lots = DEMO_LOTS.map(l => ({ ...l, id: nextId++ }));
  dbConnected = false;
  document.getElementById('demoBanner').style.display = 'flex';
  render();
}

// ── Chargement des lots depuis l'API ──
async function loadLotsFromDb() {
  try {
    const resp = await fetch(API_BASE);

    // Vérifier si la réponse est du JSON (et pas une page HTML "en construction")
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Le serveur ne retourne pas du JSON (réponse : ' + contentType.split(';')[0] + ')');
    }

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body.error || 'Erreur serveur HTTP ' + resp.status);
    }

    const data = await resp.json();
    if (Array.isArray(data) && data.length > 0) {
      lots = data;
      nextId = Math.max(...lots.map(l => l.id)) + 1;
      dbConnected = true;
      console.log('AquaStock : ' + lots.length + ' lots chargés depuis MySQL');
      hideErrorScreen();
      render();
      return;
    }

    // Tableau vide = base pas encore initialisée
    if (Array.isArray(data) && data.length === 0) {
      showErrorScreen(
        'Base de données vide',
        'La table lots est vide. Initialisez la base en appelant api/init.php depuis votre navigateur.'
      );
      return;
    }

  } catch (e) {
    console.warn('AquaStock : API MySQL indisponible.', e.message);

    let detail = 'Veuillez vérifier la connexion au serveur MySQL et réessayer.';
    if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      detail = 'Le serveur est injoignable. Vérifiez que les fichiers PHP sont bien déployés sur votre hébergement.';
    } else if (e.message.includes('JSON')) {
      detail = 'Le serveur retourne une page HTML au lieu de données JSON. Vérifiez que PHP est actif et que les fichiers api/ sont bien en place.';
    } else if (e.message) {
      detail = e.message;
    }

    showErrorScreen('Impossible de se connecter', detail);
    return;
  }

  // Fallback imprévu
  showErrorScreen('Erreur inattendue', 'La réponse du serveur est dans un format inconnu.');
}

// ── Sauvegarde d'un lot (POST = nouveau, PUT = existant) ──
async function saveLotToDb(lot) {
  if (!dbConnected) return;
  try {
    const resp = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lot),
    });
    const result = await resp.json();
    if (result.id) lot.id = result.id;
  } catch (e) {
    console.warn('AquaStock : erreur sauvegarde lot', e.message);
  }
}

// ── Mise à jour d'un lot existant ──
async function updateLotInDb(lot) {
  if (!dbConnected) return;
  try {
    await fetch(API_BASE + '?id=' + lot.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lot),
    });
  } catch (e) {
    console.warn('AquaStock : erreur update lot', e.message);
  }
}

// ── Suppression d'un lot ──
async function deleteLotFromDb(lotId) {
  if (!dbConnected) return;
  try {
    await fetch(API_BASE + '?id=' + lotId, { method: 'DELETE' });
  } catch (e) {
    console.warn('AquaStock : erreur suppression lot', e.message);
  }
}

// ── Mise à jour en masse (après navigation temporelle) ──
async function bulkUpdateDb() {
  if (!dbConnected) return;
  try {
    await fetch(API_BASE + '?action=bulk_update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lots: lots.map(l => ({ id: l.id, currentWeight: l.currentWeight, toRemove: l.toRemove || false }))
      }),
    });
  } catch (e) {
    console.warn('AquaStock : erreur bulk update', e.message);
  }
}

// ── Lancement du chargement ──
loadLotsFromDb();
