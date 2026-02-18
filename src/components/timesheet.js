// Timesheet Tab Component
import { getVessels, getTags } from '../data/adminLists.js';
import { getCurrentUser } from '../data/store.js';
import {
  getEntriesForVesselDate, addEntry, updateEntry, deleteEntry,
  calcDuration, formatDuration, formatTime, getDateStr, formatDateDisplay
} from '../data/store.js';

let currentVessel = getVessels()[0];
let currentDateOffset = 0;
let currentDateStr = getDateStr(0);

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
      <button class="add-btn" id="addEntryBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add
      </button>
    </div>

    <div class="progress-bar-container" id="progressBarContainer" style="display:none;">
      <div class="progress-bar-track">
        <div class="progress-bar-fill" id="progressBarFill"></div>
      </div>
      <span class="progress-bar-label" id="progressBarLabel">0h / 24h</span>
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
            <th></th>
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
      <p>No entries for this day. Click <strong>+ Add</strong> to get started.</p>
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

  if (entries.length === 0) {
    table.style.display = 'none';
    emptyState.style.display = 'block';
    document.getElementById('progressBarContainer').style.display = 'none';
    return;
  }

  table.style.display = 'block';
  emptyState.style.display = 'none';

  // Sort by start time
  entries.sort((a, b) => a.start.localeCompare(b.start));

  tbody.innerHTML = entries.map(entry => {
    const dur = calcDuration(entry.start, entry.end);
    const tagObj = allTags.find(t => t.name === entry.tag);
    const tagColor = tagObj ? tagObj.color : '#cbd5e0';
    // Use a light version of the color for background, or just the color with opacity?
    // Let's use the color as background and maybe white text if dark, or just use the color as is.
    // The previous design used pastels. The new colors are somewhat bright.
    // Let's use style="background-color: ${tagColor}; color: white;" for a solid badge.

    return `
      <tr>
        <td>${formatTime(entry.start)}</td>
        <td>${formatTime(entry.end)}</td>
        <td>${formatDuration(dur)}</td>
        <td>${entry.activity}</td>
        <td>
          <span class="entry-tag" style="background-color: ${tagColor}; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
            ${entry.tag}
          </span>
        </td>
        <td>
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
        </td>
      </tr>
    `;
  }).join('');

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
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  progressLabel.textContent = mins > 0 ? `${hrs}h ${mins}m / 24h` : `${hrs}h / 24h`;

  // Bind click handlers
  tbody.querySelectorAll('.edit').forEach(btn => {
    btn.addEventListener('click', () => openEditForm(btn.dataset.id, entries));
  });
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
  document.getElementById('vesselSelect').addEventListener('change', (e) => {
    currentVessel = e.target.value;
    renderEntries();
  });

  document.querySelectorAll('.date-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDateOffset = parseInt(btn.dataset.offset);
      currentDateStr = getDateStr(currentDateOffset);
      document.getElementById('timesheetTitle').textContent = `Timesheet on ${formatDateDisplay(currentDateStr)}`;
      renderEntries();
    });
  });

  document.getElementById('addEntryBtn').addEventListener('click', openAddForm);
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
    tag: tagVal
  };

  closePanel();
  showLoading(true);

  if (idVal) {
    await updateEntry(idVal, data);
  } else {
    await addEntry(data);
  }

  await renderEntries();
}

export function getCurrentVessel() { return currentVessel; }
export function getCurrentDateStr() { return currentDateStr; }
