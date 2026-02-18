// Dashboard Tab Component
import { Chart, registerables } from 'chart.js';
import { getVessels, getTags } from '../data/adminLists.js';
import {
  getEntriesForVesselDate, calcDuration, formatDuration,
  getDateStr, formatDateDisplay, getDateOffset, setDateOffset,
  getCurrentUser
} from '../data/store.js';

Chart.register(...registerables);

let dashVessel = getVessels()[0];
let dashDateOffset = 0;
let dashDateStr = getDateStr(0);
let tagChart = null;

export function initDashboard() {
  const container = document.getElementById('tab-dashboard');

  // Sync date from store
  dashDateOffset = getDateOffset();
  dashDateStr = getDateStr(dashDateOffset);

  container.innerHTML = buildDashboardHTML();
  populateVesselSelect();
  bindDashboardEvents();
  refreshDashboard();
}

function buildDashboardHTML() {
  return `
    <div class="control-section">
      <div class="control-label">
        Vessel
        <span class="required-badge">Required</span>
      </div>
      <select class="vessel-select" id="dashVesselSelect"></select>
    </div>

    <div class="control-section">
      <div class="control-label"><span></span><span class="required-badge">Required</span></div>
      <div class="date-buttons">
        <button class="date-btn dash-date-btn ${dashDateOffset === -1 ? 'active' : ''}" data-offset="-1">Yesterday</button>
        <button class="date-btn dash-date-btn ${dashDateOffset === 0 ? 'active' : ''}" data-offset="0">Today</button>
        <button class="date-btn dash-date-btn ${dashDateOffset === 1 ? 'active' : ''}" data-offset="1">Tomorrow</button>
      </div>
    </div>

    <div id="dashDate" style="font-size:14px; color:var(--text-muted); margin-bottom:20px;">${formatDashDate()}</div>

    <div class="dashboard-grid" id="dashStats"></div>

    <div class="chart-card">
      <h3>Hours by Tag</h3>
      <div class="chart-container">
        <canvas id="tagChart"></canvas>
      </div>
    </div>
  `;
}

function formatDashDate() {
  const d = new Date(dashDateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function populateVesselSelect() {
  const sel = document.getElementById('dashVesselSelect');
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
      dashVessel = userVessel;
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

  sel.innerHTML = vessels.map(v => `<option value="${v}" ${v === dashVessel ? 'selected' : ''}>${v}</option>`).join('');
  if (!vessels.includes(dashVessel) && vessels.length > 0) {
    dashVessel = vessels[0];
    sel.value = dashVessel;
  }
}

function bindDashboardEvents() {
  document.getElementById('dashVesselSelect').addEventListener('change', (e) => {
    dashVessel = e.target.value;
    renderDashboard();
  });

  document.querySelectorAll('.dash-date-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dash-date-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dashDateOffset = parseInt(btn.dataset.offset);
      setDateOffset(dashDateOffset); // Save to shared store
      dashDateStr = getDateStr(dashDateOffset);
      document.getElementById('dashDate').textContent = formatDashDate();
      renderDashboard();
    });
  });
}

async function renderDashboard() {
  let entries;
  try {
    entries = await getEntriesForVesselDate(dashVessel, dashDateStr);
  } catch (err) {
    console.error('Dashboard fetch failed:', err);
    entries = [];
  }

  let totalMin = 0;
  const tagMinutes = {};

  entries.forEach(e => {
    const dur = calcDuration(e.start, e.end);
    totalMin += dur;
    tagMinutes[e.tag] = (tagMinutes[e.tag] || 0) + dur;
  });

  const statsEl = document.getElementById('dashStats');
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

  renderTagChart(tagMinutes);
}



function renderTagChart(tagMinutes) {
  const canvas = document.getElementById('tagChart');
  if (!canvas) return;
  if (tagChart) tagChart.destroy();

  const labels = Object.keys(tagMinutes);
  const data = labels.map(l => Math.round(tagMinutes[l] / 60 * 100) / 100);

  // Get colors dynamically
  const allTags = getTags();
  const colors = labels.map(l => {
    const tag = allTags.find(t => t.name === l);
    return tag ? tag.color : '#cbd5e0';
  });

  if (labels.length === 0) {
    tagChart = new Chart(canvas, {
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

  tagChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Hours', data, backgroundColor: colors,
        borderRadius: 6, borderSkipped: false,
      }]
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

export function refreshDashboard() {
  // Sync date from store
  dashDateOffset = getDateOffset();
  dashDateStr = getDateStr(dashDateOffset);

  // Update UI headers/buttons
  document.querySelectorAll('.dash-date-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.offset) === dashDateOffset);
  });
  const dateEl = document.getElementById('dashDate');
  if (dateEl) {
    dateEl.textContent = formatDashDate();
  }

  // Re-populate vessel dropdown from admin lists (respects Vessel role locking)
  populateVesselSelect();
  renderDashboard();
}
