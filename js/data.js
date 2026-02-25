/**
 * data.js
 * Données de démonstration — lots initiaux.
 */

lots = [
  // ── Truite Arc-en-ciel ──
  { id: nextId++, name: 'A1', speciesKey: 'truite-arc', calibreKey: 'e200400',   quantity: 620, currentWeight: 430,  costPrice: 7.80,  salePrice: 9.50  },
  { id: nextId++, name: 'A2', speciesKey: 'truite-arc', calibreKey: 'e200400',   quantity: 480, currentWeight: 310,  costPrice: 7.80,  salePrice: 9.50  },
  { id: nextId++, name: 'A3', speciesKey: 'truite-arc', calibreKey: 'e200400',   quantity: 390, currentWeight: 460,  costPrice: 7.80,  salePrice: 9.50  },
  { id: nextId++, name: 'A4', speciesKey: 'truite-arc', calibreKey: 'e200400',   quantity: 310, currentWeight: 140,  costPrice: 7.80,  salePrice: 9.50  },
  { id: nextId++, name: 'B1', speciesKey: 'truite-arc', calibreKey: 'e8001200',  quantity: 850, currentWeight: 980,  costPrice: 7.80,  salePrice: 9.50  },
  { id: nextId++, name: 'B2', speciesKey: 'truite-arc', calibreKey: 'e8001200',  quantity: 490, currentWeight: 1100, costPrice: 7.80,  salePrice: 9.50  },
  { id: nextId++, name: 'B3', speciesKey: 'truite-arc', calibreKey: 'e8001200',  quantity: 360, currentWeight: 1340, costPrice: 7.80,  salePrice: 9.50  },
  { id: nextId++, name: 'B4', speciesKey: 'truite-arc', calibreKey: 'e8001200',  quantity: 700, currentWeight: 600,  costPrice: 7.80,  salePrice: 9.50  },
  { id: nextId++, name: 'C1', speciesKey: 'truite-arc', calibreKey: 'e15002500', quantity: 280, currentWeight: 1800, costPrice: 8.10,  salePrice: 9.90  },
  { id: nextId++, name: 'C2', speciesKey: 'truite-arc', calibreKey: 'e15002500', quantity: 200, currentWeight: 1100, costPrice: 8.10,  salePrice: 9.90  },
  { id: nextId++, name: 'D1', speciesKey: 'truite-arc', calibreKey: 'f200400',   quantity: 300, currentWeight: 280,  costPrice: 9.50,  salePrice: 11.40 },
  { id: nextId++, name: 'D2', speciesKey: 'truite-arc', calibreKey: 'f200400',   quantity: 180, currentWeight: 430,  costPrice: 9.50,  salePrice: 11.40 },
  { id: nextId++, name: 'D3', speciesKey: 'truite-arc', calibreKey: 'f400600',   quantity: 220, currentWeight: 510,  costPrice: 9.80,  salePrice: 11.60 },
  // ── Truite Fario ──
  { id: nextId++, name: 'F1', speciesKey: 'truite-fario', calibreKey: 'e200400',  quantity: 280, currentWeight: 250,  costPrice: 11.20, salePrice: 13.00 },
  { id: nextId++, name: 'F2', speciesKey: 'truite-fario', calibreKey: 'e200400',  quantity: 190, currentWeight: 380,  costPrice: 11.20, salePrice: 13.00 },
  { id: nextId++, name: 'F3', speciesKey: 'truite-fario', calibreKey: 'e200400',  quantity: 160, currentWeight: 460,  costPrice: 11.20, salePrice: 13.00 },
  { id: nextId++, name: 'F4', speciesKey: 'truite-fario', calibreKey: 'e200400',  quantity: 220, currentWeight: 110,  costPrice: 11.20, salePrice: 13.00 },
  { id: nextId++, name: 'G1', speciesKey: 'truite-fario', calibreKey: 'e8001200', quantity: 150, currentWeight: 950,  costPrice: 11.20, salePrice: 13.00 },
  { id: nextId++, name: 'G2', speciesKey: 'truite-fario', calibreKey: 'e8001200', quantity: 120, currentWeight: 1150, costPrice: 11.20, salePrice: 13.00 },
  { id: nextId++, name: 'G3', speciesKey: 'truite-fario', calibreKey: 'e8001200', quantity: 200, currentWeight: 500,  costPrice: 11.20, salePrice: 13.00 },
  { id: nextId++, name: 'H1', speciesKey: 'truite-fario', calibreKey: 'f160200',  quantity: 100, currentWeight: 185,  costPrice: 13.10, salePrice: 15.00 },
  // ── Saumon de Fontaine ──
  { id: nextId++, name: 'R1', speciesKey: 'saumon-fontaine', calibreKey: 'e8001200',  quantity: 410, currentWeight: 1050, costPrice: 12.30, salePrice: 14.00 },
  { id: nextId++, name: 'R2', speciesKey: 'saumon-fontaine', calibreKey: 'e8001200',  quantity: 290, currentWeight: 870,  costPrice: 12.30, salePrice: 14.00 },
  { id: nextId++, name: 'R3', speciesKey: 'saumon-fontaine', calibreKey: 'e8001200',  quantity: 350, currentWeight: 1340, costPrice: 12.30, salePrice: 14.00 },
  { id: nextId++, name: 'R4', speciesKey: 'saumon-fontaine', calibreKey: 'e8001200',  quantity: 500, currentWeight: 580,  costPrice: 12.30, salePrice: 14.00 },
  { id: nextId++, name: 'S1', speciesKey: 'saumon-fontaine', calibreKey: 'e15002500', quantity: 340, currentWeight: 1900, costPrice: 12.30, salePrice: 14.00 },
  { id: nextId++, name: 'S2', speciesKey: 'saumon-fontaine', calibreKey: 'e15002500', quantity: 260, currentWeight: 2300, costPrice: 12.30, salePrice: 14.00 },
  { id: nextId++, name: 'S3', speciesKey: 'saumon-fontaine', calibreKey: 'e15002500', quantity: 180, currentWeight: 2750, costPrice: 12.30, salePrice: 14.00 },
  { id: nextId++, name: 'S4', speciesKey: 'saumon-fontaine', calibreKey: 'e15002500', quantity: 500, currentWeight: 900,  costPrice: 12.30, salePrice: 14.00 },
  { id: nextId++, name: 'T1', speciesKey: 'saumon-fontaine', calibreKey: 'f400600',   quantity: 200, currentWeight: 490,  costPrice: 15.10, salePrice: 17.00 },
  { id: nextId++, name: 'T2', speciesKey: 'saumon-fontaine', calibreKey: 'f400600',   quantity: 150, currentWeight: 650,  costPrice: 15.10, salePrice: 17.00 },
  // ── Omble Chevalier ──
  { id: nextId++, name: 'N1', speciesKey: 'omble', calibreKey: 'e8001200',  quantity: 180, currentWeight: 950,  costPrice: 16.20, salePrice: 18.00 },
  { id: nextId++, name: 'N2', speciesKey: 'omble', calibreKey: 'e8001200',  quantity: 140, currentWeight: 1100, costPrice: 16.20, salePrice: 18.00 },
  { id: nextId++, name: 'N3', speciesKey: 'omble', calibreKey: 'e8001200',  quantity: 200, currentWeight: 600,  costPrice: 16.20, salePrice: 18.00 },
  { id: nextId++, name: 'O1', speciesKey: 'omble', calibreKey: 'e15002500', quantity: 220, currentWeight: 1600, costPrice: 16.20, salePrice: 18.00 },
  { id: nextId++, name: 'O2', speciesKey: 'omble', calibreKey: 'e15002500', quantity: 150, currentWeight: 2200, costPrice: 16.20, salePrice: 18.00 },
  { id: nextId++, name: 'O3', speciesKey: 'omble', calibreKey: 'e15002500', quantity: 110, currentWeight: 2800, costPrice: 16.20, salePrice: 18.00 },
  { id: nextId++, name: 'O4', speciesKey: 'omble', calibreKey: 'e15002500', quantity: 300, currentWeight: 900,  costPrice: 16.20, salePrice: 18.00 },
  { id: nextId++, name: 'P1', speciesKey: 'omble', calibreKey: 'f200400',   quantity: 80,  currentWeight: 250,  costPrice: 20.10, salePrice: 22.00 },
  // ── Lavaret ──
  { id: nextId++, name: 'L1', speciesKey: 'lavaret', calibreKey: 'e200400',  quantity: 460, currentWeight: 310,  costPrice: 9.30, salePrice: 11.00 },
  { id: nextId++, name: 'L2', speciesKey: 'lavaret', calibreKey: 'e200400',  quantity: 310, currentWeight: 260,  costPrice: 9.30, salePrice: 11.00 },
  { id: nextId++, name: 'L3', speciesKey: 'lavaret', calibreKey: 'e200400',  quantity: 200, currentWeight: 430,  costPrice: 9.30, salePrice: 11.00 },
  { id: nextId++, name: 'L4', speciesKey: 'lavaret', calibreKey: 'e200400',  quantity: 380, currentWeight: 130,  costPrice: 9.30, salePrice: 11.00 },
  { id: nextId++, name: 'M1', speciesKey: 'lavaret', calibreKey: 'e8001200', quantity: 250, currentWeight: 900,  costPrice: 9.30, salePrice: 11.00 },
  { id: nextId++, name: 'M2', speciesKey: 'lavaret', calibreKey: 'e8001200', quantity: 180, currentWeight: 650,  costPrice: 9.30, salePrice: 11.00 },
  { id: nextId++, name: 'K1', speciesKey: 'lavaret', calibreKey: 'f160200',  quantity: 200, currentWeight: 175,  costPrice: 11.50, salePrice: 13.30 },
  { id: nextId++, name: 'K2', speciesKey: 'lavaret', calibreKey: 'f160200',  quantity: 140, currentWeight: 125,  costPrice: 11.50, salePrice: 13.30 },
];
