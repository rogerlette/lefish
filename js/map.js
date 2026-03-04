/**
 * map.js — Carte interactive des bassins de pisciculture
 * Pan/zoom infini style Google Maps, rendu Canvas 2D
 */

// ================================================================
// CONFIGURATION DES BASSINS
// ================================================================

// Chaque bassin a une position (x, y), une taille, un nombre de compartiments,
// une direction de flux d'eau, et les codes des lots dans chaque compartiment.
const FACILITY = {
  // Titre de la pisciculture
  name: 'Pisciculture Charles Murgat',

  // Couleurs
  waterColor: '#dbeafe',
  waterDeepColor: '#bfdbfe',
  wallColor: '#1e3a5f',
  flowColor: '#60a5fa',
  gridBg: '#f0f4f8',

  // Liste des bassins
  ponds: [
    // === Rangée haute — Bassins d'alevinage ===
    {
      id: 'alevin-1',
      label: 'Alevinage 1',
      x: 100, y: 80,
      width: 500, height: 160,
      compartments: 5,
      flow: 'right',
      codes: ['AL1-A', 'AL1-B', 'AL1-C', 'AL1-D', 'AL1-E'],
      type: 'alevinage',
    },
    {
      id: 'alevin-2',
      label: 'Alevinage 2',
      x: 100, y: 280,
      width: 500, height: 160,
      compartments: 5,
      flow: 'right',
      codes: ['AL2-A', 'AL2-B', 'AL2-C', 'AL2-D', 'AL2-E'],
      type: 'alevinage',
    },

    // === Rangée centrale — Bassins de grossissement ===
    {
      id: 'gross-1',
      label: 'Grossissement 1',
      x: 100, y: 520,
      width: 700, height: 220,
      compartments: 4,
      flow: 'right',
      codes: ['G1-A', 'G1-B', 'G1-C', 'G1-D'],
      type: 'grossissement',
    },
    {
      id: 'gross-2',
      label: 'Grossissement 2',
      x: 100, y: 780,
      width: 700, height: 220,
      compartments: 4,
      flow: 'left',
      codes: ['G2-A', 'G2-B', 'G2-C', 'G2-D'],
      type: 'grossissement',
    },
    {
      id: 'gross-3',
      label: 'Grossissement 3',
      x: 100, y: 1040,
      width: 700, height: 220,
      compartments: 4,
      flow: 'right',
      codes: ['G3-A', 'G3-B', 'G3-C', 'G3-D'],
      type: 'grossissement',
    },

    // === Rangée droite — Bassins de finition ===
    {
      id: 'finish-1',
      label: 'Finition 1',
      x: 900, y: 80,
      width: 280, height: 360,
      compartments: 3,
      flow: 'down',
      codes: ['F1-A', 'F1-B', 'F1-C'],
      type: 'finition',
    },
    {
      id: 'finish-2',
      label: 'Finition 2',
      x: 1240, y: 80,
      width: 280, height: 360,
      compartments: 3,
      flow: 'down',
      codes: ['F2-A', 'F2-B', 'F2-C'],
      type: 'finition',
    },

    // === Bassin circulaire / stockage ===
    {
      id: 'stock-1',
      label: 'Stockage',
      x: 900, y: 520,
      width: 620, height: 220,
      compartments: 2,
      flow: 'right',
      codes: ['ST-A', 'ST-B'],
      type: 'stockage',
    },

    // === Bassin de traitement ===
    {
      id: 'trait-1',
      label: 'Traitement',
      x: 900, y: 800,
      width: 620, height: 180,
      compartments: 3,
      flow: 'left',
      codes: ['TR-A', 'TR-B', 'TR-C'],
      type: 'traitement',
    },

    // === Bassin de reproduction ===
    {
      id: 'repro-1',
      label: 'Reproduction',
      x: 900, y: 1040,
      width: 620, height: 220,
      compartments: 2,
      flow: 'right',
      codes: ['RP-A', 'RP-B'],
      type: 'reproduction',
    },
  ],

  // Canaux d'eau (connexions visuelles entre bassins)
  channels: [
    // Arrivée d'eau
    { x1: 40, y1: 150, x2: 100, y2: 150, label: 'Arrivée' },
    { x1: 40, y1: 350, x2: 100, y2: 350 },
    // Connexion alevinage → grossissement
    { x1: 350, y1: 240, x2: 350, y2: 520 },
    // Connexion grossissement → finition
    { x1: 800, y1: 630, x2: 900, y2: 630 },
    // Sortie
    { x1: 1520, y1: 160, x2: 1600, y2: 160, label: 'Sortie' },
  ],
};

// Type colors
const TYPE_COLORS = {
  alevinage:     { fill: '#dbeafe', border: '#3b82f6', header: '#2563eb', text: '#1e40af' },
  grossissement: { fill: '#d1fae5', border: '#10b981', header: '#059669', text: '#065f46' },
  finition:      { fill: '#fef3c7', border: '#f59e0b', header: '#d97706', text: '#92400e' },
  stockage:      { fill: '#e0e7ff', border: '#6366f1', header: '#4f46e5', text: '#3730a3' },
  traitement:    { fill: '#fce7f3', border: '#ec4899', header: '#db2777', text: '#9d174d' },
  reproduction:  { fill: '#ede9fe', border: '#8b5cf6', header: '#7c3aed', text: '#5b21b6' },
};

// ================================================================
// STATE
// ================================================================
let canvas, ctx, container;
let miniCanvas, miniCtx;

// Camera
let camX = 0, camY = 0, zoom = 1;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 8;

// Interaction
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let dragCamStartX = 0, dragCamStartY = 0;
let lastPinchDist = 0;
let dragMoved = false;

// Selected compartment
let selectedPond = null;
let selectedComp = -1;

// Hover
let hoverPond = null;
let hoverComp = -1;

// Animation
let animTime = 0;
let animFrame = null;

// ================================================================
// INIT
// ================================================================
function init() {
  canvas = document.getElementById('mapCanvas');
  ctx = canvas.getContext('2d');
  container = document.getElementById('mapContainer');
  miniCanvas = document.getElementById('minimapCanvas');
  miniCtx = miniCanvas.getContext('2d');

  resizeCanvas();
  centerView();

  // Events
  window.addEventListener('resize', resizeCanvas);

  // Mouse
  container.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  container.addEventListener('wheel', onWheel, { passive: false });
  container.addEventListener('dblclick', onDblClick);

  // Touch
  container.addEventListener('touchstart', onTouchStart, { passive: false });
  container.addEventListener('touchmove', onTouchMove, { passive: false });
  container.addEventListener('touchend', onTouchEnd);

  // Buttons
  document.getElementById('zoomInBtn').addEventListener('click', () => zoomTo(zoom * 1.4));
  document.getElementById('zoomOutBtn').addEventListener('click', () => zoomTo(zoom / 1.4));
  document.getElementById('resetBtn').addEventListener('click', centerView);
  document.getElementById('panelClose').addEventListener('click', closePanel);

  // Start render loop
  animate();
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w = container.clientWidth;
  const h = container.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function centerView() {
  // Find bounding box of all ponds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of FACILITY.ponds) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.width);
    maxY = Math.max(maxY, p.y + p.height);
  }
  const bw = maxX - minX;
  const bh = maxY - minY;
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const padding = 80;
  zoom = Math.min((cw - padding * 2) / bw, (ch - padding * 2) / bh, 1.2);
  camX = (minX + bw / 2) - cw / (2 * zoom);
  camY = (minY + bh / 2) - ch / (2 * zoom);
  updateZoomDisplay();
}

function updateZoomDisplay() {
  document.getElementById('zoomLevel').textContent = Math.round(zoom * 100) + '%';
}

function zoomTo(newZoom, pivotX, pivotY) {
  newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
  if (pivotX === undefined) {
    pivotX = container.clientWidth / 2;
    pivotY = container.clientHeight / 2;
  }
  // World point under pivot before zoom
  const wx = camX + pivotX / zoom;
  const wy = camY + pivotY / zoom;
  zoom = newZoom;
  // Adjust cam so same world point stays under pivot
  camX = wx - pivotX / zoom;
  camY = wy - pivotY / zoom;
  updateZoomDisplay();
}

// ================================================================
// COORDINATE HELPERS
// ================================================================
function screenToWorld(sx, sy) {
  return {
    x: camX + sx / zoom,
    y: camY + sy / zoom,
  };
}

function worldToScreen(wx, wy) {
  return {
    x: (wx - camX) * zoom,
    y: (wy - camY) * zoom,
  };
}

// ================================================================
// HIT TESTING
// ================================================================
function hitTest(wx, wy) {
  for (const pond of FACILITY.ponds) {
    if (wx >= pond.x && wx <= pond.x + pond.width &&
        wy >= pond.y && wy <= pond.y + pond.height) {
      // Which compartment?
      const isVertical = pond.flow === 'down' || pond.flow === 'up';
      let compIdx;
      if (isVertical) {
        const compH = pond.height / pond.compartments;
        compIdx = Math.floor((wy - pond.y) / compH);
      } else {
        const compW = pond.width / pond.compartments;
        compIdx = Math.floor((wx - pond.x) / compW);
      }
      compIdx = Math.max(0, Math.min(pond.compartments - 1, compIdx));
      return { pond, compIdx };
    }
  }
  return null;
}

// ================================================================
// MOUSE EVENTS
// ================================================================
function onMouseDown(e) {
  if (e.button !== 0) return;
  isDragging = true;
  dragMoved = false;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragCamStartX = camX;
  dragCamStartY = camY;
}

function onMouseMove(e) {
  const rect = container.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  if (isDragging) {
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
    camX = dragCamStartX - dx / zoom;
    camY = dragCamStartY - dy / zoom;
  } else {
    // Hover detection
    const w = screenToWorld(sx, sy);
    const hit = hitTest(w.x, w.y);
    if (hit) {
      hoverPond = hit.pond;
      hoverComp = hit.compIdx;
      container.style.cursor = 'pointer';
    } else {
      hoverPond = null;
      hoverComp = -1;
      container.style.cursor = 'grab';
    }
  }
}

function onMouseUp(e) {
  if (isDragging && !dragMoved) {
    // Click — check if we hit a compartment
    const rect = container.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = screenToWorld(sx, sy);
    const hit = hitTest(w.x, w.y);
    if (hit) {
      selectCompartment(hit.pond, hit.compIdx);
    } else {
      closePanel();
    }
  }
  isDragging = false;
}

function onWheel(e) {
  e.preventDefault();
  const rect = container.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  zoomTo(zoom * factor, sx, sy);
}

function onDblClick(e) {
  const rect = container.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  zoomTo(zoom * 2, sx, sy);
}

// ================================================================
// TOUCH EVENTS
// ================================================================
function onTouchStart(e) {
  if (e.touches.length === 1) {
    isDragging = true;
    dragMoved = false;
    dragStartX = e.touches[0].clientX;
    dragStartY = e.touches[0].clientY;
    dragCamStartX = camX;
    dragCamStartY = camY;
  } else if (e.touches.length === 2) {
    isDragging = false;
    lastPinchDist = pinchDist(e);
  }
  e.preventDefault();
}

function onTouchMove(e) {
  if (e.touches.length === 1 && isDragging) {
    const dx = e.touches[0].clientX - dragStartX;
    const dy = e.touches[0].clientY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
    camX = dragCamStartX - dx / zoom;
    camY = dragCamStartY - dy / zoom;
  } else if (e.touches.length === 2) {
    const dist = pinchDist(e);
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const rect = container.getBoundingClientRect();
    const factor = dist / lastPinchDist;
    zoomTo(zoom * factor, midX - rect.left, midY - rect.top);
    lastPinchDist = dist;
  }
  e.preventDefault();
}

function onTouchEnd(e) {
  if (e.touches.length === 0 && !dragMoved && isDragging) {
    // Tap
    const rect = container.getBoundingClientRect();
    const sx = dragStartX - rect.left;
    const sy = dragStartY - rect.top;
    const w = screenToWorld(sx, sy);
    const hit = hitTest(w.x, w.y);
    if (hit) {
      selectCompartment(hit.pond, hit.compIdx);
    } else {
      closePanel();
    }
  }
  isDragging = false;
}

function pinchDist(e) {
  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// ================================================================
// SELECTION
// ================================================================
function selectCompartment(pond, compIdx) {
  selectedPond = pond;
  selectedComp = compIdx;
  const code = pond.codes[compIdx] || '—';

  document.getElementById('panelCode').textContent = code;
  document.getElementById('panelSubtitle').textContent = pond.label + ' — Compartiment ' + (compIdx + 1);

  // Build detail content
  const body = document.getElementById('panelBody');
  body.innerHTML = `
    <div class="lot-panel-row">
      <span class="lot-panel-label">Bassin</span>
      <span class="lot-panel-value">${pond.label}</span>
    </div>
    <div class="lot-panel-row">
      <span class="lot-panel-label">Type</span>
      <span class="lot-panel-value" style="text-transform:capitalize">${pond.type}</span>
    </div>
    <div class="lot-panel-row">
      <span class="lot-panel-label">Compartiment</span>
      <span class="lot-panel-value">${compIdx + 1} / ${pond.compartments}</span>
    </div>
    <div class="lot-panel-row">
      <span class="lot-panel-label">Code lot</span>
      <span class="lot-panel-value">${code}</span>
    </div>
    <div class="lot-panel-row">
      <span class="lot-panel-label">Sens du flux</span>
      <span class="lot-panel-value">${flowLabel(pond.flow)}</span>
    </div>
  `;

  document.getElementById('panelLink').href = 'index.html#lot=' + encodeURIComponent(code);
  document.getElementById('lotPanel').classList.add('active');
}

function flowLabel(dir) {
  const labels = { right: '→ Droite', left: '← Gauche', down: '↓ Bas', up: '↑ Haut' };
  return labels[dir] || dir;
}

function closePanel() {
  selectedPond = null;
  selectedComp = -1;
  document.getElementById('lotPanel').classList.remove('active');
}

// ================================================================
// RENDERING
// ================================================================
function animate() {
  animTime += 0.02;
  draw();
  drawMinimap();
  animFrame = requestAnimationFrame(animate);
}

function draw() {
  const w = container.clientWidth;
  const h = container.clientHeight;

  ctx.clearRect(0, 0, w, h);

  // Background grid pattern
  drawGrid(w, h);

  ctx.save();
  ctx.translate(-camX * zoom, -camY * zoom);
  ctx.scale(zoom, zoom);

  // Draw channels
  drawChannels();

  // Draw ponds
  for (const pond of FACILITY.ponds) {
    drawPond(pond);
  }

  // Draw facility label
  if (zoom > 0.3) {
    ctx.font = `bold ${Math.max(14, 18 / zoom * 0.5)}px Inter, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(FACILITY.name, 100, 60);
  }

  ctx.restore();
}

function drawGrid(w, h) {
  // Subtle dot grid
  const spacing = 40 * zoom;
  if (spacing < 8) return; // Too zoomed out

  const offsetX = (-camX * zoom) % spacing;
  const offsetY = (-camY * zoom) % spacing;

  ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';

  for (let x = offsetX; x < w; x += spacing) {
    for (let y = offsetY; y < h; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawChannels() {
  ctx.strokeStyle = '#93c5fd';
  ctx.lineWidth = 8;
  ctx.setLineDash([12, 8]);
  ctx.lineDashOffset = -animTime * 60;

  for (const ch of FACILITY.channels) {
    ctx.beginPath();
    ctx.moveTo(ch.x1, ch.y1);
    ctx.lineTo(ch.x2, ch.y2);
    ctx.stroke();

    if (ch.label && zoom > 0.4) {
      ctx.setLineDash([]);
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillStyle = '#3b82f6';
      ctx.textAlign = 'center';
      ctx.fillText(ch.label, (ch.x1 + ch.x2) / 2, (ch.y1 + ch.y2) / 2 - 12);
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = -animTime * 60;
    }
  }

  ctx.setLineDash([]);
}

function drawPond(pond) {
  const tc = TYPE_COLORS[pond.type] || TYPE_COLORS.grossissement;
  const isVertical = pond.flow === 'down' || pond.flow === 'up';
  const isSelected = selectedPond === pond;
  const isHover = hoverPond === pond;

  // Pond shadow
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  roundRect(ctx, pond.x + 3, pond.y + 3, pond.width, pond.height, 6);
  ctx.fill();

  // Pond background
  ctx.fillStyle = tc.fill;
  ctx.strokeStyle = tc.border;
  ctx.lineWidth = 2;
  roundRect(ctx, pond.x, pond.y, pond.width, pond.height, 6);
  ctx.fill();
  ctx.stroke();

  // Draw compartments
  for (let i = 0; i < pond.compartments; i++) {
    let cx, cy, cw, ch;
    if (isVertical) {
      const compH = pond.height / pond.compartments;
      cx = pond.x;
      cy = pond.y + i * compH;
      cw = pond.width;
      ch = compH;
    } else {
      const compW = pond.width / pond.compartments;
      cx = pond.x + i * compW;
      cy = pond.y;
      cw = compW;
      ch = pond.height;
    }

    // Compartment hover / selection highlight
    const isThisSelected = isSelected && selectedComp === i;
    const isThisHover = isHover && hoverComp === i;

    if (isThisSelected) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fillRect(cx, cy, cw, ch);
    } else if (isThisHover) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(cx, cy, cw, ch);
    }

    // Water flow pattern (animated chevrons)
    drawWaterFlow(cx, cy, cw, ch, pond.flow, tc);

    // Compartment separator
    if (i > 0) {
      ctx.strokeStyle = tc.border;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      if (isVertical) {
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + cw, cy);
      } else {
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy + ch);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Compartment code label
    if (zoom > 0.25) {
      const code = pond.codes[i] || '';
      const fontSize = Math.max(10, Math.min(16, 14 * Math.min(cw, ch) / 120));
      ctx.font = `bold ${fontSize}px 'DM Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Text background pill
      const textW = ctx.measureText(code).width + 12;
      const textH = fontSize + 8;
      const textX = cx + cw / 2;
      const textY = cy + ch / 2;

      ctx.fillStyle = isThisSelected ? 'rgba(59, 130, 246, 0.85)' : 'rgba(255,255,255,0.85)';
      roundRect(ctx, textX - textW / 2, textY - textH / 2, textW, textH, 4);
      ctx.fill();

      ctx.fillStyle = isThisSelected ? '#ffffff' : tc.text;
      ctx.fillText(code, textX, textY);
    }

    // Selected border
    if (isThisSelected) {
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.strokeRect(cx + 1, cy + 1, cw - 2, ch - 2);
    }
  }

  // Pond label (header)
  if (zoom > 0.3) {
    const labelFontSize = Math.max(10, Math.min(13, 12));
    ctx.font = `600 ${labelFontSize}px Inter, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = tc.header;
    ctx.fillText(pond.label, pond.x + 4, pond.y - 6);
  }
}

function drawWaterFlow(cx, cy, cw, ch, direction, tc) {
  // Animated flow lines / chevrons
  const alpha = 0.2;
  ctx.strokeStyle = tc.border;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.5;

  const spacing = 28;
  const chevronSize = 6;
  const offset = (animTime * 30) % spacing;

  ctx.beginPath();

  if (direction === 'right') {
    for (let x = cx - offset; x < cx + cw; x += spacing) {
      const mid = cy + ch / 2;
      for (let row = -2; row <= 2; row++) {
        const ry = mid + row * (ch / 5);
        if (ry < cy + 8 || ry > cy + ch - 8) continue;
        if (x < cx + 4 || x > cx + cw - 4) continue;
        ctx.moveTo(x, ry - chevronSize);
        ctx.lineTo(x + chevronSize, ry);
        ctx.lineTo(x, ry + chevronSize);
      }
    }
  } else if (direction === 'left') {
    for (let x = cx + cw + offset; x > cx; x -= spacing) {
      const mid = cy + ch / 2;
      for (let row = -2; row <= 2; row++) {
        const ry = mid + row * (ch / 5);
        if (ry < cy + 8 || ry > cy + ch - 8) continue;
        if (x < cx + 4 || x > cx + cw - 4) continue;
        ctx.moveTo(x, ry - chevronSize);
        ctx.lineTo(x - chevronSize, ry);
        ctx.lineTo(x, ry + chevronSize);
      }
    }
  } else if (direction === 'down') {
    for (let y = cy - offset; y < cy + ch; y += spacing) {
      const mid = cx + cw / 2;
      for (let col = -2; col <= 2; col++) {
        const rx = mid + col * (cw / 5);
        if (rx < cx + 8 || rx > cx + cw - 8) continue;
        if (y < cy + 4 || y > cy + ch - 4) continue;
        ctx.moveTo(rx - chevronSize, y);
        ctx.lineTo(rx, y + chevronSize);
        ctx.lineTo(rx + chevronSize, y);
      }
    }
  } else if (direction === 'up') {
    for (let y = cy + ch + offset; y > cy; y -= spacing) {
      const mid = cx + cw / 2;
      for (let col = -2; col <= 2; col++) {
        const rx = mid + col * (cw / 5);
        if (rx < cx + 8 || rx > cx + cw - 8) continue;
        if (y < cy + 4 || y > cy + ch - 4) continue;
        ctx.moveTo(rx - chevronSize, y);
        ctx.lineTo(rx, y - chevronSize);
        ctx.lineTo(rx + chevronSize, y);
      }
    }
  }

  ctx.stroke();
  ctx.globalAlpha = 1;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ================================================================
// MINIMAP
// ================================================================
function drawMinimap() {
  const mw = miniCanvas.width;
  const mh = miniCanvas.height;
  miniCtx.clearRect(0, 0, mw, mh);

  // Bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of FACILITY.ponds) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.width);
    maxY = Math.max(maxY, p.y + p.height);
  }
  const pad = 40;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const bw = maxX - minX;
  const bh = maxY - minY;
  const scale = Math.min(mw / bw, mh / bh);
  const ox = (mw - bw * scale) / 2;
  const oy = (mh - bh * scale) / 2;

  // Background
  miniCtx.fillStyle = '#f8fafc';
  miniCtx.fillRect(0, 0, mw, mh);

  // Draw ponds
  for (const p of FACILITY.ponds) {
    const tc = TYPE_COLORS[p.type] || TYPE_COLORS.grossissement;
    const px = ox + (p.x - minX) * scale;
    const py = oy + (p.y - minY) * scale;
    const pw = p.width * scale;
    const ph = p.height * scale;
    miniCtx.fillStyle = tc.fill;
    miniCtx.strokeStyle = tc.border;
    miniCtx.lineWidth = 1;
    miniCtx.fillRect(px, py, pw, ph);
    miniCtx.strokeRect(px, py, pw, ph);
  }

  // Viewport rectangle
  const vw = container.clientWidth;
  const vh = container.clientHeight;
  const vx = ox + (camX - minX) * scale;
  const vy = oy + (camY - minY) * scale;
  const vvw = (vw / zoom) * scale;
  const vvh = (vh / zoom) * scale;

  miniCtx.strokeStyle = '#ef4444';
  miniCtx.lineWidth = 1.5;
  miniCtx.strokeRect(vx, vy, vvw, vvh);
  miniCtx.fillStyle = 'rgba(239, 68, 68, 0.08)';
  miniCtx.fillRect(vx, vy, vvw, vvh);
}

// ================================================================
// START
// ================================================================
document.addEventListener('DOMContentLoaded', init);
