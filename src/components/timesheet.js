// Timesheet Tab Component
import { Chart, registerables } from 'chart.js';
import { getVessels, getTags } from '../data/adminLists.js';
import { getCurrentUser } from '../data/store.js';

Chart.register(...registerables);
import {
  getEntriesForVesselDate, addEntry, updateEntry, deleteEntry,
  calcDuration, formatDuration, formatTime, getDateStr, formatDateDisplay,
  getDateOffset, setDateOffset
} from '../data/store.js';

function isViewOnly() {
  const role = getCurrentUser()?.role;
  return role === 'Dispatcher';
}

let currentVessel = getVessels()[0];
let currentDateOffset = 0;
let currentDateStr = getDateStr(0);
let lastEntries = [];
let inlineDashChart = null;
let inlineDashOpen = false;

function populateVesselSelect() {
  const sel = document.getElementById('vesselSelect');
  if (!sel) return;
  const vessels = getVessels();
  const user = getCurrentUser();

  // Clean up previous static label if any
  const parent = sel.parentNode;
  const existingLabel = parent.querySelector('.vessel-static-text');
  if (existingLabel) existingLabel.remove();
  sel.style.display = 'block';

  if (user && user.role === 'Vessel') {
    const userVessel = vessels.find(v => v === user.name);
    if (userVessel) {
      currentVessel = userVessel;
      sel.innerHTML = `<option value="${userVessel}">${userVessel}</option>`;
      sel.value = userVessel;
      sel.style.display = 'none';

      const staticText = document.createElement('div');
      staticText.className = 'vessel-static-text';
      staticText.textContent = userVessel;
      staticText.style.fontWeight = '600';
      staticText.style.padding = '8px 12px';
      staticText.style.background = '#f7fafc';
      staticText.style.borderRadius = '6px';
      staticText.style.border = '1px solid #e2e8f0';
      staticText.style.marginTop = '4px';
      parent.appendChild(staticText);
      return;
    }
  }

  sel.innerHTML = vessels.map(v => `<option value="${v}" ${v === currentVessel ? 'selected' : ''}>${v}</option>`).join('');
  if (!vessels.includes(currentVessel) && vessels.length > 0) {
    currentVessel = vessels[0];
    sel.value = currentVessel;
  }
}

function populateTagSelect() {
  const sel = document.getElementById('entryTag');
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">Select tag...</option>' +
    getTags().map(t => `<option value="${t.name}">${t.name}</option>`).join('');
  if (currentVal) sel.value = currentVal;
}

export function initTimesheet() {
  const container = document.getElementById('tab-timesheet');
  // Sync date from store
  currentDateOffset = getDateOffset();
  currentDateStr = getDateStr(currentDateOffset);
  inlineDashOpen = false;
  inlineDashChart = null;

  container.innerHTML = buildTimesheetHTML();
  populateVesselSelect();
  bindTimesheetEvents();
  renderEntries();
}

function buildTimesheetHTML() {
  return `
    <div class="control-section">
      <div class="control-label">
        Vessel
      </div>
      <select class="vessel-select" id="vesselSelect"></select>
    </div>

    <div class="control-section">
      <div class="control-label">
        <span></span>
      </div>
      <div class="date-buttons">
        <button class="date-btn ${currentDateOffset === -1 ? 'active' : ''}" data-offset="-1">Yesterday</button>
        <button class="date-btn ${currentDateOffset === 0 ? 'active' : ''}" data-offset="0">Today</button>
        <button class="date-btn ${currentDateOffset === 1 ? 'active' : ''}" data-offset="1">Tomorrow</button>
      </div>
    </div>

    <div class="timesheet-header">
      <h2 class="timesheet-title" id="timesheetTitle">Timesheet on ${formatDateDisplay(currentDateStr)}</h2>
      ${isViewOnly() ? '' : `<button class="add-btn" id="addEntryBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add
      </button>`}
    </div>

    <div class="progress-bar-container" id="progressBarContainer" style="display:none;">
      <div class="progress-bar-track">
        <div class="progress-bar-fill" id="progressBarFill"></div>
      </div>
      <span class="progress-bar-label" id="progressBarLabel">0h / 24h</span>
      <button class="progress-expand-btn" id="progressExpandBtn" title="Show day summary">
        <svg id="progressExpandIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
    </div>

    <div class="inline-dashboard" id="inlineDashboard">
      <div class="dashboard-grid" id="inlineDashStats"></div>
      <div class="chart-card" style="margin-top:16px;">
        <h3>Hours by Tag</h3>
        <div class="chart-container">
          <canvas id="inlineTagChart"></canvas>
        </div>
      </div>
    </div>

    <div class="loading-indicator" id="loadingIndicator" style="display:none;">
      <div class="spinner"></div>
      <span>Loading from Airtable...</span>
    </div>

    <div class="entries-table" id="entriesTable">
      <table>
        <thead>
          <tr>
            <th>Start</th>
            <th>End</th>
            <th>Duration</th>
            <th>Activity</th>
            <th>Tag</th>
            ${isViewOnly() ? '' : '<th></th>'}
          </tr>
        </thead>
        <tbody id="entriesBody"></tbody>
      </table>
    </div>
    <div class="empty-state" id="emptyState" style="display:none;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <p>${isViewOnly() ? 'No entries for this day.' : 'No entries for this day. Click <strong>+ Add</strong> to get started.'}</p>
    </div>
  `;
}

function getTagClass(tag) {
  return tag.toLowerCase().replace(/\s+/g, '-');
}

// Validate HHMM format: HH = 00-23, MM = 00-59
function isValidHHMM(value) {
  if (!/^\d{4}$/.test(value)) return false;
  const hh = parseInt(value.substring(0, 2), 10);
  const mm = parseInt(value.substring(2, 4), 10);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function validateTimeInput(input) {
  const val = input.value.trim();
  if (val === '') {
    input.style.borderColor = '';
    input.style.boxShadow = '';
    return true; // empty is handled by required
  }
  if (!isValidHHMM(val)) {
    input.style.borderColor = '#e53e3e';
    input.style.boxShadow = '0 0 0 2px rgba(229, 62, 62, 0.2)';
    return false;
  }
  input.style.borderColor = '#38a169';
  input.style.boxShadow = '0 0 0 2px rgba(56, 161, 105, 0.2)';
  return true;
}

function updateSubmitButton() {
  const btn = document.querySelector('#entryForm .btn-primary');
  if (!btn) return;

  const startVal = document.getElementById('entryStart').value.trim();
  const endVal = document.getElementById('entryEnd').value.trim();
  const activityVal = document.getElementById('entryActivity').value.trim();
  const tagVal = document.getElementById('entryTag').value;

  const allFilled = startVal && endVal && activityVal && tagVal;
  const startOk = isValidHHMM(startVal);
  const endOk = isValidHHMM(endVal);
  const timeOrder = startVal < endVal;

  const valid = allFilled && startOk && endOk && timeOrder;
  btn.disabled = !valid;
  btn.style.opacity = valid ? '1' : '0.5';
  btn.style.cursor = valid ? 'pointer' : 'not-allowed';
}

function showLoading(show) {
  const loader = document.getElementById('loadingIndicator');
  if (loader) loader.style.display = show ? 'flex' : 'none';
}

export async function renderEntries() {
  populateVesselSelect();
  showLoading(true);
  let entries;
  try {
    entries = await getEntriesForVesselDate(currentVessel, currentDateStr);
  } catch (err) {
    console.error('Failed to load entries:', err);
    entries = [];
  }
  showLoading(false);

  const tbody = document.getElementById('entriesBody');
  const emptyState = document.getElementById('emptyState');
  const table = document.getElementById('entriesTable');

  // Get latest tags for colors
  const allTags = getTags();

  lastEntries = entries;

  if (entries.length === 0) {
    table.style.display = 'none';
    emptyState.style.display = 'block';
    document.getElementById('progressBarContainer').style.display = 'none';
    if (inlineDashOpen) renderInlineDashboard();
    return;
  }

  table.style.display = 'block';
  emptyState.style.display = 'none';

  // Sort by start time
  entries.sort((a, b) => a.start.localeCompare(b.start));

  let rowsHTML = '';
  entries.forEach((entry, i) => {
    // Insert gap row if there's unlogged time between consecutive entries
    if (i > 0) {
      const prevEnd = entries[i - 1].end;
      const currStart = entry.start;
      if (prevEnd < currStart) {
        const gapMin = calcDuration(prevEnd, currStart);
        rowsHTML += `
          <tr class="gap-row">
            <td colspan="6">${formatTime(prevEnd)} — ${formatTime(currStart)} · ${formatDuration(gapMin)} gap</td>
          </tr>`;
      }
    }

    const dur = calcDuration(entry.start, entry.end);
    const tagObj = allTags.find(t => t.name === entry.tag);
    const tagColor = tagObj ? tagObj.color : '#cbd5e0';

    const pendingStyle = entry._pendingSync ? ' style="opacity:0.6;" title="Not saved to Airtable"' : '';
    const viewOnly = isViewOnly();
    rowsHTML += `
      <tr class="entry-row" data-id="${entry.id}" style="cursor: ${viewOnly ? 'default' : 'pointer'};"${pendingStyle ? pendingStyle : ''}>
        <td>${formatTime(entry.start)}</td>
        <td>${formatTime(entry.end)}</td>
        <td>${formatDuration(dur)}</td>
        <td>${entry.activity}</td>
        <td>
          <span class="entry-tag" style="background-color: ${tagColor}; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
            ${entry.tag}
          </span>
        </td>
        ${viewOnly ? '' : `<td>
          <div class="entry-actions">
            <button class="entry-action-btn edit" data-id="${entry.id}" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="entry-action-btn delete" data-id="${entry.id}" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </td>`}
      </tr>`;
  });
  tbody.innerHTML = rowsHTML;

  // Total duration for progress bar
  const totalMinutes = entries.reduce((sum, e) => sum + calcDuration(e.start, e.end), 0);

  // Update progress bar
  const maxMinutes = 24 * 60;
  const pct = Math.min((totalMinutes / maxMinutes) * 100, 100);
  const progressContainer = document.getElementById('progressBarContainer');
  const progressFill = document.getElementById('progressBarFill');
  const progressLabel = document.getElementById('progressBarLabel');
  progressContainer.style.display = 'flex';
  progressFill.style.width = `${pct}%`;
  let hrs = Math.floor(totalMinutes / 60);
  let mins = totalMinutes % 60;

  // Round 23h 59m to 24h
  if (hrs === 23 && mins === 59) {
    hrs = 24;
    mins = 0;
  }

  progressLabel.textContent = mins > 0 ? `${hrs}h ${mins}m / 24h` : `${hrs}h / 24h`;

  if (inlineDashOpen) renderInlineDashboard();

  // Double-click to edit (not for view-only)
  if (!isViewOnly()) {
  tbody.querySelectorAll('.entry-row').forEach(row => {
    row.addEventListener('dblclick', () => {
      openEditForm(row.dataset.id, entries);
    });
  });
  }
  tbody.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.classList.contains('confirm-delete')) {
        showLoading(true);
        await deleteEntry(btn.dataset.id);
        await renderEntries();
      } else {
        btn.classList.add('confirm-delete');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span style="color:#e53e3e; font-weight:600; font-size:11px;">Delete</span>';

        setTimeout(() => {
          if (document.body.contains(btn)) {
            btn.classList.remove('confirm-delete');
            btn.innerHTML = originalHTML;
          }
        }, 3000);
      }
    });
  });
}

function bindTimesheetEvents() {
  const container = document.getElementById('tab-timesheet');

  document.getElementById('vesselSelect').addEventListener('change', (e) => {
    currentVessel = e.target.value;
    renderEntries();
  });

  container.querySelectorAll('.date-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDateOffset = parseInt(btn.dataset.offset);
      setDateOffset(currentDateOffset); // Save to shared store
      currentDateStr = getDateStr(currentDateOffset);
      document.getElementById('timesheetTitle').textContent = `Timesheet on ${formatDateDisplay(currentDateStr)}`;
      renderEntries();
    });
  });

  const addBtn = document.getElementById('addEntryBtn');
  if (addBtn) addBtn.addEventListener('click', openAddForm);

  document.getElementById('progressExpandBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleInlineDashboard();
  });
}

function toggleInlineDashboard() {
  inlineDashOpen = !inlineDashOpen;
  const panel = document.getElementById('inlineDashboard');
  const icon = document.getElementById('progressExpandIcon');
  if (!panel) return;
  if (inlineDashOpen) {
    panel.classList.add('open');
    if (icon) icon.style.transform = 'rotate(180deg)';
    renderInlineDashboard();
  } else {
    panel.classList.remove('open');
    if (icon) icon.style.transform = '';
  }
}

function renderInlineDashboard() {
  const statsEl = document.getElementById('inlineDashStats');
  const canvas = document.getElementById('inlineTagChart');
  if (!statsEl || !canvas) return;

  const entries = lastEntries;
  let totalMin = 0;
  const tagMinutes = {};
  entries.forEach(e => {
    const dur = calcDuration(e.start, e.end);
    totalMin += dur;
    tagMinutes[e.tag] = (tagMinutes[e.tag] || 0) + dur;
  });

  statsEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${entries.length}</div>
      <div class="stat-label">Activities</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${formatDuration(totalMin)}</div>
      <div class="stat-label">Total Duration</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${Object.keys(tagMinutes).length}</div>
      <div class="stat-label">Tags Used</div>
    </div>
  `;

  if (inlineDashChart) { inlineDashChart.destroy(); inlineDashChart = null; }

  const labels = Object.keys(tagMinutes);
  const data = labels.map(l => Math.round(tagMinutes[l] / 60 * 100) / 100);
  const allTags = getTags();
  const colors = labels.map(l => {
    const tag = allTags.find(t => t.name === l);
    return tag ? tag.color : '#cbd5e0';
  });

  if (labels.length === 0) {
    inlineDashChart = new Chart(canvas, {
      type: 'bar',
      data: { labels: ['No data'], datasets: [{ data: [0], backgroundColor: '#E0E0E0' }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
    return;
  }

  inlineDashChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Hours', data, backgroundColor: colors, borderRadius: 6, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} hours` } }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Hours' }, grid: { color: '#F0F0F0' } },
        x: { grid: { display: false } }
      }
    }
  });
}

export function refreshTimesheet() {
  // Sync state from store
  currentDateOffset = getDateOffset();
  currentDateStr = getDateStr(currentDateOffset);

  // Update UI — scope to timesheet container to avoid affecting dashboard buttons
  const container = document.getElementById('tab-timesheet');
  container.querySelectorAll('.date-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.offset) === currentDateOffset);
  });
  const titleEl = document.getElementById('timesheetTitle');
  if (titleEl) {
    titleEl.textContent = `Timesheet on ${formatDateDisplay(currentDateStr)}`;
  }

  renderEntries();
}

function showFieldError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

function clearFieldError(fieldId) {
  const el = document.getElementById(fieldId);
  if (el) {
    el.textContent = '';
    el.style.display = 'none';
  }
}

function clearAllFieldErrors() {
  ['startError', 'endError', 'activityError', 'tagError'].forEach(id => clearFieldError(id));
}

function checkTimeOrder() {
  const startVal = document.getElementById('entryStart').value.trim();
  const endVal = document.getElementById('entryEnd').value.trim();

  if (isValidHHMM(startVal) && isValidHHMM(endVal) && startVal >= endVal) {
    const startInput = document.getElementById('entryStart');
    const endInput = document.getElementById('entryEnd');
    [startInput, endInput].forEach(inp => {
      inp.style.borderColor = '#e53e3e';
      inp.style.boxShadow = '0 0 0 2px rgba(229, 62, 62, 0.2)';
    });
    showFieldError('startError', 'Start must be earlier than End');
    showFieldError('endError', 'End must be later than Start');
    return false;
  }
  return true;
}

function updateFormErrors() {
  const startVal = document.getElementById('entryStart').value.trim();
  const endVal = document.getElementById('entryEnd').value.trim();

  // Clear time errors first
  clearFieldError('startError');
  clearFieldError('endError');

  if (startVal && !isValidHHMM(startVal)) {
    showFieldError('startError', 'Invalid format. Use HHMM (00:00–23:59)');
  } else if (endVal && !isValidHHMM(endVal)) {
    showFieldError('endError', 'Invalid format. Use HHMM (00:00–23:59)');
  } else if (isValidHHMM(startVal) && isValidHHMM(endVal) && startVal >= endVal) {
    showFieldError('startError', 'Start must be earlier than End');
    showFieldError('endError', 'End must be later than Start');
  }
}

function attachFormValidationListeners() {
  const startInput = document.getElementById('entryStart');
  const endInput = document.getElementById('entryEnd');
  const activityInput = document.getElementById('entryActivity');
  const tagSelect = document.getElementById('entryTag');

  // Time field validation + submit button update
  [startInput, endInput].forEach(inp => {
    inp.oninput = () => {
      if (inp.value.trim().length === 4) validateTimeInput(inp);
      else { inp.style.borderColor = ''; inp.style.boxShadow = ''; }
      checkTimeOrder();
      updateFormErrors();
      updateSubmitButton();
    };
    inp.onblur = () => {
      validateTimeInput(inp);
      checkTimeOrder();
      updateFormErrors();
      updateSubmitButton();
    };
  });

  // Activity and tag just update the submit button
  activityInput.oninput = updateSubmitButton;
  tagSelect.onchange = updateSubmitButton;
}

async function openAddForm() {
  const form = document.getElementById('entryForm');
  form.reset();
  document.getElementById('entryId').value = '';
  document.getElementById('panelTitle').textContent = 'Add item';
  populateTagSelect();

  // Pre-fill Start with the latest End time from existing entries
  try {
    const entries = await getEntriesForVesselDate(currentVessel, currentDateStr);
    if (entries.length > 0) {
      const latestEnd = entries
        .map(e => e.end)
        .filter(t => isValidHHMM(t))
        .sort()
        .pop();
      if (latestEnd) {
        document.getElementById('entryStart').value = latestEnd;
      }
    } else {
      document.getElementById('entryStart').value = '0000';
    }
  } catch (err) {
    console.warn('Could not pre-fill start time:', err);
  }

  // Reset validation styles
  const startInput = document.getElementById('entryStart');
  const endInput = document.getElementById('entryEnd');
  [startInput, endInput].forEach(inp => {
    inp.style.borderColor = '';
    inp.style.boxShadow = '';
  });

  attachFormValidationListeners();
  clearAllFieldErrors();
  updateSubmitButton(); // starts disabled
  openPanel();
}

function openEditForm(id, entries) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;
  populateTagSelect();

  document.getElementById('entryStart').value = entry.start;
  document.getElementById('entryEnd').value = entry.end;
  document.getElementById('entryActivity').value = entry.activity;
  document.getElementById('entryTag').value = entry.tag;
  document.getElementById('entryId').value = entry.id;
  document.getElementById('panelTitle').textContent = 'Edit item';
  attachFormValidationListeners();
  clearAllFieldErrors();
  updateSubmitButton();
  openPanel();
}

function openPanel() {
  document.getElementById('panelOverlay').classList.add('open');
}

export function closePanel() {
  document.getElementById('panelOverlay').classList.remove('open');
}

function showSyncError(msg) {
  const container = document.getElementById('tab-timesheet');
  if (!container) return;
  const existing = container.querySelector('.sync-error-banner');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.className = 'sync-error-banner';
  banner.style.cssText = 'background:#fff5f5; border:1px solid #fed7d7; color:#c53030; padding:10px 14px; border-radius:8px; font-size:13px; margin:8px 0; display:flex; align-items:center; gap:8px;';
  banner.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <span>Failed to save to Airtable: ${msg}. Check Airtable settings in the Admin tab.</span>`;
  const table = document.getElementById('entriesTable');
  if (table) table.before(banner);
  setTimeout(() => banner.remove(), 8000);
}

export async function handleFormSubmit(e) {
  e.preventDefault();

  const startInput = document.getElementById('entryStart');
  const endInput = document.getElementById('entryEnd');
  const startVal = startInput.value.trim();
  const endVal = endInput.value.trim();
  const activityVal = document.getElementById('entryActivity').value.trim();
  const tagVal = document.getElementById('entryTag').value;
  const idVal = document.getElementById('entryId').value;

  if (!startVal || !endVal || !activityVal || !tagVal) return;

  // Validate HHMM format
  clearAllFieldErrors();
  const startOk = isValidHHMM(startVal);
  const endOk = isValidHHMM(endVal);
  if (!startOk) {
    validateTimeInput(startInput);
    showFieldError('startError', 'Invalid format. Use HHMM (00:00–23:59)');
  }
  if (!endOk) {
    validateTimeInput(endInput);
    showFieldError('endError', 'Invalid format. Use HHMM (00:00–23:59)');
  }
  if (!startOk || !endOk) {
    return;
  }

  // Start must be earlier than End
  if (startVal >= endVal) {
    [startInput, endInput].forEach(inp => {
      inp.style.borderColor = '#e53e3e';
      inp.style.boxShadow = '0 0 0 2px rgba(229, 62, 62, 0.2)';
    });
    showFieldError('startError', 'Start must be earlier than End');
    showFieldError('endError', 'End must be later than Start');
    return;
  }

  // Check for overlapping entries
  try {
    const existingEntries = await getEntriesForVesselDate(currentVessel, currentDateStr);
    const overlap = existingEntries.find(entry => {
      // Skip the entry being edited
      if (idVal && entry.id === idVal) return false;
      // Two ranges overlap if one starts before the other ends
      return startVal < entry.end && endVal > entry.start;
    });

    if (overlap) {
      const overlapStart = overlap.start.substring(0, 2) + ':' + overlap.start.substring(2);
      const overlapEnd = overlap.end.substring(0, 2) + ':' + overlap.end.substring(2);
      [startInput, endInput].forEach(inp => {
        inp.style.borderColor = '#e53e3e';
        inp.style.boxShadow = '0 0 0 2px rgba(229, 62, 62, 0.2)';
      });
      showFieldError('startError', `Overlaps with ${overlapStart}–${overlapEnd}`);
      showFieldError('endError', `Overlaps with ${overlapStart}–${overlapEnd}`);
      return;
    }
  } catch (err) {
    console.warn('Could not check overlaps:', err);
  }

  const data = {
    vessel: currentVessel,
    date: currentDateStr,
    start: startVal,
    end: endVal,
    activity: activityVal,
    tag: tagVal,
    userEmail: getCurrentUser()?.email || ''
  };

  closePanel();
  showLoading(true);

  const { error } = idVal ? await updateEntry(idVal, data) : await addEntry(data);

  await renderEntries();

  if (error) {
    showSyncError(error);
  }
}

export function getCurrentVessel() { return currentVessel; }
export function getCurrentDateStr() { return currentDateStr; }
