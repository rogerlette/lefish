/**
 * actions.js
 * Actions utilisateur : toggles, modal lot, éditeur calibres.
 */

// ================================================================
// TOGGLES ESPÈCE / CALIBRE
// ================================================================
function toggleSpecies(key) {
  collapsedSpecies[key] = !collapsedSpecies[key];
  render();
}

function toggleCalibre(key) {
  collapsedCalibre[key] = !collapsedCalibre[key];
  render();
}

function toggleAllCalibres(speciesKey) {
  const spLots = lots.filter(l => l.speciesKey === speciesKey);
  const calKeys = [...new Set(spLots.map(l => `${speciesKey}|${l.calibreKey}`))];
  const anyExpanded = calKeys.some(k => !collapsedCalibre[k]);
  calKeys.forEach(k => { collapsedCalibre[k] = anyExpanded; });
  render();
}

// ================================================================
// MODAL AJOUT LOT
// ================================================================
function renderSpeciesPicker(selectedKey) {
  let html = '<div class="species-picker">';
  SPECIES.forEach(sp => {
    html += `
      <button class="sp-pick-btn ${selectedKey === sp.key ? 'selected' : ''}"
        onclick="pickSpecies('${sp.key}')"
        style="${selectedKey === sp.key ? `border-color:${sp.color};border-width:2px` : ''}">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${sp.color};flex-shrink:0"></span>
        <span>${sp.name}</span>
      </button>`;
  });
  return html + '</div>';
}

function renderCalibrePicker(selectedKey) {
  const filtered = CALIBRES.filter(c => !modalSpeciesKey || !c.species || c.species.includes(modalSpeciesKey));
  let html = '<div class="calibre-picker">';
  if (filtered.length === 0) {
    html += '<span style="color:var(--muted);font-size:12px;padding:8px">Aucun calibre pour cette espèce</span>';
  }
  filtered.forEach(cal => {
    const typeColor = cal.type === 'entier' ? '#0ea5e9' : '#7c3aed';
    html += `
      <button class="cal-pick-btn ${selectedKey === cal.key ? 'selected' : ''}"
        onclick="pickCalibre('${cal.key}')"
        style="${selectedKey === cal.key ? `border-color:${typeColor};border-width:2px` : ''}">
        <span class="cal-type-tag ${cal.type}" style="background:${typeColor}">${cal.type === 'entier' ? 'E' : 'F'}</span>
        <span>${cal.label}</span>
      </button>`;
  });
  return html + '</div>';
}

function pickSpecies(key) {
  modalSpeciesKey = key;
  const available = CALIBRES.filter(c => !c.species || c.species.includes(key));
  if (modalCalibreKey && !available.find(c => c.key === modalCalibreKey)) {
    modalCalibreKey = available[0]?.key || null;
  }
  document.getElementById('speciesPickerWrap').innerHTML  = renderSpeciesPicker(key);
  document.getElementById('calibrePickerWrap').innerHTML  = renderCalibrePicker(modalCalibreKey);
  const sp = SPECIES.find(s => s.key === key);
  if (sp) {
    document.getElementById('f-cost').value = sp.defaults.costPrice;
    document.getElementById('f-sale').value = sp.defaults.salePrice;
  }
}

function pickCalibre(key) {
  modalCalibreKey = key;
  document.getElementById('calibrePickerWrap').innerHTML = renderCalibrePicker(key);
  const cal = CALIBRES.find(c => c.key === key);
  if (cal) {
    document.getElementById('f-target').value = cal.targetMin;
    document.getElementById('f-max').value    = cal.targetMax;
    if (!document.getElementById('f-size').value) {
      document.getElementById('f-size').value = Math.round(cal.targetMin * 0.7);
    }
  }
}

function openModal(speciesKey, calibreKey) {
  modalSpeciesKey = speciesKey;
  modalCalibreKey = calibreKey;
  document.getElementById('speciesPickerWrap').innerHTML = renderSpeciesPicker(speciesKey);
  document.getElementById('calibrePickerWrap').innerHTML = renderCalibrePicker(calibreKey);
  const sp = SPECIES.find(s => s.key === speciesKey);
  if (sp) {
    document.getElementById('f-cost').value = sp.defaults.costPrice;
    document.getElementById('f-sale').value = sp.defaults.salePrice;
  } else {
    document.getElementById('f-cost').value = '';
    document.getElementById('f-sale').value = '';
  }
  const cal = CALIBRES.find(c => c.key === calibreKey);
  if (cal) {
    document.getElementById('f-target').value = cal.targetMin;
    document.getElementById('f-max').value    = cal.targetMax;
    document.getElementById('f-size').value   = Math.round(cal.targetMin * 0.7);
  } else {
    ['f-target', 'f-max', 'f-size'].forEach(id => { document.getElementById(id).value = ''; });
  }
  document.getElementById('f-name').value = '';
  document.getElementById('f-qty').value  = '';
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

function confirmAdd() {
  if (!modalSpeciesKey) { alert('Veuillez sélectionner une espèce.'); return; }
  if (!modalCalibreKey) { alert('Veuillez sélectionner un calibre.'); return; }
  const name   = document.getElementById('f-name').value.trim();
  const qty    = parseFloat(document.getElementById('f-qty').value);
  const weight = parseFloat(document.getElementById('f-size').value);
  const target = parseFloat(document.getElementById('f-target').value);
  const max    = parseFloat(document.getElementById('f-max').value);
  const cost   = parseFloat(document.getElementById('f-cost').value);
  const sale   = parseFloat(document.getElementById('f-sale').value);
  if (!name || isNaN(qty) || isNaN(weight) || isNaN(target) || isNaN(max) || isNaN(cost) || isNaN(sale)) {
    alert('Veuillez remplir tous les champs.'); return;
  }
  if (qty <= 0 || weight <= 0) { alert('Les valeurs numériques doivent être positives.'); return; }
  if (sale <= cost) { alert('Le prix de vente doit être supérieur au prix de revient.'); return; }
  const newLot = {
    id: nextId++, name,
    speciesKey: modalSpeciesKey, calibreKey: modalCalibreKey,
    quantity: qty, currentWeight: weight,
    targetWeight: target, costPrice: cost, salePrice: sale,
  };
  lots.push(newLot);
  saveLotToDb(newLot);
  collapsedSpecies[modalSpeciesKey] = false;
  closeModal();
  render();
}

// ================================================================
// ÉDITEUR DE CALIBRES
// ================================================================
function openCalibreEditor() {
  renderCalibreEditorTable();
  document.getElementById('calibreEditorOverlay').classList.add('active');
}

function closeCalibreEditor() {
  document.getElementById('calibreEditorOverlay').classList.remove('active');
  render();
}

function renderCalibreEditorTable() {
  const tbody = document.getElementById('calibreEditorBody');
  tbody.innerHTML = CALIBRES.map((c, i) => {
    const spChecks = SPECIES.map(sp => {
      const checked = c.species && c.species.includes(sp.key);
      return `
        <label class="species-check-label ${checked ? 'checked' : ''}" style="${checked ? `background:${sp.color}` : ''}">
          <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleCalibreSpecies(${i},'${sp.key}',this.checked)">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${checked ? 'white' : sp.color};margin-right:3px;vertical-align:middle;flex-shrink:0"></span>${sp.name}
        </label>`;
    }).join('');
    return `
      <tr>
        <td><input type="text"   value="${c.label}"     onchange="updateCalibre(${i},'label',this.value)"></td>
        <td><select onchange="updateCalibre(${i},'type',this.value)">
          <option value="entier" ${c.type === 'entier' ? 'selected' : ''}>Entier</option>
          <option value="filet"  ${c.type === 'filet'  ? 'selected' : ''}>Filet</option>
        </select></td>
        <td><input type="number" value="${c.min}"       min="0" step="10" onchange="updateCalibre(${i},'min',+this.value)"></td>
        <td><input type="number" value="${c.max}"       min="0" step="10" onchange="updateCalibre(${i},'max',+this.value)"></td>
        <td><input type="number" value="${c.targetMin}" min="0" step="10" onchange="updateCalibre(${i},'targetMin',+this.value)"></td>
        <td><input type="number" value="${c.targetMax}" min="0" step="10" onchange="updateCalibre(${i},'targetMax',+this.value)"></td>
        <td><div class="species-checks">${spChecks}</div></td>
        <td><button class="calibre-del-btn" onclick="deleteCalibre(${i})" title="Supprimer">✕</button></td>
      </tr>`;
  }).join('');
}

function toggleCalibreSpecies(i, spKey, checked) {
  if (!CALIBRES[i].species) CALIBRES[i].species = [];
  if (checked) {
    if (!CALIBRES[i].species.includes(spKey)) CALIBRES[i].species.push(spKey);
  } else {
    CALIBRES[i].species = CALIBRES[i].species.filter(k => k !== spKey);
  }
  renderCalibreEditorTable();
}

function updateCalibre(i, field, val) {
  CALIBRES[i][field] = val;
  if (field === 'label') {
    CALIBRES[i].key = val.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) + i;
  }
}

function addCalibre() {
  const i = CALIBRES.length;
  CALIBRES.push({ key: 'new' + i, label: 'Nouveau ' + i, type: 'entier', min: 0, max: 500, targetMin: 0, targetMax: 500 });
  renderCalibreEditorTable();
}

function deleteCalibre(i) {
  if (CALIBRES.length <= 1) return;
  CALIBRES.splice(i, 1);
  renderCalibreEditorTable();
}
