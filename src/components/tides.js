// Tides Tab Component
import { generateTideData } from '../data/sampleData.js';

let currentLocation = 'Conakry';

const CONAKRY_TIDE_URL = 'https://www.tide-forecast.com/tide/Conakry-Guinea/tide-times';

const CONAKRY_RAW_DATA = `
Tide Times for Conakry, Guinea (tomorrow): Tuesday 17 February 2026
Low Tide 2:06 AM (Tue 17 February) 0.75 m
High Tide 8:04 AM (Tue 17 February) 3.35 m
Low Tide 2:13 PM (Tue 17 February) 0.61 m
High Tide 8:23 PM (Tue 17 February) 3.65 m

Tide Times for Conakry, Guinea: Wednesday 18 February 2026
Low Tide 2:39 AM (Wed 18 February) 0.6 m
High Tide 8:37 AM (Wed 18 February) 3.47 m
Low Tide 2:46 PM (Wed 18 February) 0.51 m
High Tide 8:55 PM (Wed 18 February) 3.74 m

Tide Times for Conakry, Guinea: Thursday 19 February 2026
Low Tide 3:12 AM (Thu 19 February) 0.5 m
High Tide 9:10 AM (Thu 19 February) 3.55 m
Low Tide 3:21 PM (Thu 19 February) 0.47 m
High Tide 9:27 PM (Thu 19 February) 3.77 m

Tide Times for Conakry, Guinea: Friday 20 February 2026
Low Tide 3:46 AM (Fri 20 February) 0.47 m
High Tide 9:45 AM (Fri 20 February) 3.56 m
Low Tide 3:57 PM (Fri 20 February) 0.5 m
High Tide 10:02 PM (Fri 20 February) 3.73 m

Tide Times for Conakry, Guinea: Saturday 21 February 2026
Low Tide 4:22 AM (Sat 21 February) 0.51 m
High Tide 10:22 AM (Sat 21 February) 3.51 m
Low Tide 4:35 PM (Sat 21 February) 0.61 m
High Tide 10:39 PM (Sat 21 February) 3.61 m

Tide Times for Conakry, Guinea: Sunday 22 February 2026
Low Tide 5:01 AM (Sun 22 February) 0.62 m
High Tide 11:02 AM (Sun 22 February) 3.39 m
Low Tide 5:17 PM (Sun 22 February) 0.78 m
High Tide 11:20 PM (Sun 22 February) 3.41 m

Tide Times for Conakry, Guinea: Monday 23 February 2026
Low Tide 5:45 AM (Mon 23 February) 0.79 m
High Tide 11:49 AM (Mon 23 February) 3.21 m
Low Tide 6:08 PM (Mon 23 February) 1.01 m

Tide Times for Conakry, Guinea: Tuesday 24 February 2026
High Tide 00:09 AM (Tue 24 February) 3.15 m
Low Tide 6:39 AM (Tue 24 February) 1.0 m
High Tide 12:48 PM (Tue 24 February) 3.01 m
Low Tide 7:12 PM (Tue 24 February) 1.25 m

Tide Times for Conakry, Guinea: Wednesday 25 February 2026
High Tide 1:14 AM (Wed 25 February) 2.89 m
Low Tide 7:49 AM (Wed 25 February) 1.19 m
High Tide 2:10 PM (Wed 25 February) 2.86 m
Low Tide 8:40 PM (Wed 25 February) 1.4 m

Tide Times for Conakry, Guinea: Thursday 26 February 2026
High Tide 2:47 AM (Thu 26 February) 2.72 m
Low Tide 9:19 AM (Thu 26 February) 1.27 m
High Tide 3:53 PM (Thu 26 February) 2.87 m
Low Tide 10:20 PM (Thu 26 February) 1.35 m

Tide Times for Conakry, Guinea: Friday 27 February 2026
High Tide 4:30 AM (Fri 27 February) 2.76 m
Low Tide 10:48 AM (Fri 27 February) 1.17 m
High Tide 5:17 PM (Fri 27 February) 3.07 m
Low Tide 11:40 PM (Fri 27 February) 1.14 m

Tide Times for Conakry, Guinea: Saturday 28 February 2026
High Tide 5:45 AM (Sat 28 February) 2.95 m
Low Tide 11:57 AM (Sat 28 February) 0.96 m
High Tide 6:17 PM (Sat 28 February) 3.32 m

Tide Times for Conakry, Guinea: Sunday 01 March 2026
Low Tide 00:37 AM (Sun 01 March) 0.89 m
High Tide 6:39 AM (Sun 01 March) 3.18 m
Low Tide 12:50 PM (Sun 01 March) 0.74 m
High Tide 7:04 PM (Sun 01 March) 3.54 m

Tide Times for Conakry, Guinea: Monday 02 March 2026
Low Tide 1:24 AM (Mon 02 March) 0.67 m
High Tide 7:23 AM (Mon 02 March) 3.37 m
Low Tide 1:34 PM (Mon 02 March) 0.56 m
High Tide 7:44 PM (Mon 02 March) 3.7 m

Tide Times for Conakry, Guinea: Tuesday 03 March 2026
Low Tide 2:03 AM (Tue 03 March) 0.52 m
High Tide 8:02 AM (Tue 03 March) 3.51 m
Low Tide 2:13 PM (Tue 03 March) 0.46 m
High Tide 8:20 PM (Tue 03 March) 3.79 m

Tide Times for Conakry, Guinea: Wednesday 04 March 2026
Low Tide 2:40 AM (Wed 04 March) 0.44 m
High Tide 8:37 AM (Wed 04 March) 3.58 m
Low Tide 2:50 PM (Wed 04 March) 0.44 m
High Tide 8:54 PM (Wed 04 March) 3.79 m

Tide Times for Conakry, Guinea: Thursday 05 March 2026
Low Tide 3:14 AM (Thu 05 March) 0.45 m
High Tide 9:11 AM (Thu 05 March) 3.58 m
Low Tide 3:24 PM (Thu 05 March) 0.49 m
High Tide 9:26 PM (Thu 05 March) 3.71 m

Tide Times for Conakry, Guinea: Friday 06 March 2026
Low Tide 3:46 AM (Fri 06 March) 0.51 m
High Tide 9:44 AM (Fri 06 March) 3.52 m
Low Tide 3:56 PM (Fri 06 March) 0.61 m
High Tide 9:58 PM (Fri 06 March) 3.58 m

Tide Times for Conakry, Guinea: Saturday 07 March 2026
Low Tide 4:16 AM (Sat 07 March) 0.64 m
High Tide 10:16 AM (Sat 07 March) 3.4 m
Low Tide 4:28 PM (Sat 07 March) 0.79 m
High Tide 10:28 PM (Sat 07 March) 3.39 m

Tide Times for Conakry, Guinea: Sunday 08 March 2026
Low Tide 4:47 AM (Sun 08 March) 0.81 m
High Tide 10:49 AM (Sun 08 March) 3.24 m
Low Tide 5:01 PM (Sun 08 March) 1.0 m
High Tide 11:00 PM (Sun 08 March) 3.17 m

Tide Times for Conakry, Guinea: Monday 09 March 2026
Low Tide 5:19 AM (Mon 09 March) 1.0 m
High Tide 11:24 AM (Mon 09 March) 3.04 m
Low Tide 5:37 PM (Mon 09 March) 1.23 m
High Tide 11:34 PM (Mon 09 March) 2.92 m

Tide Times for Conakry, Guinea: Tuesday 10 March 2026
Low Tide 5:55 AM (Tue 10 March) 1.21 m
High Tide 12:06 PM (Tue 10 March) 2.83 m
Low Tide 6:21 PM (Tue 10 March) 1.46 m

Tide Times for Conakry, Guinea: Wednesday 11 March 2026
High Tide 00:17 AM (Wed 11 March) 2.68 m
Low Tide 6:43 AM (Wed 11 March) 1.41 m
High Tide 1:04 PM (Wed 11 March) 2.64 m
Low Tide 7:26 PM (Wed 11 March) 1.65 m

Tide Times for Conakry, Guinea: Thursday 12 March 2026
High Tide 1:24 AM (Thu 12 March) 2.47 m
Low Tide 7:56 AM (Thu 12 March) 1.56 m
High Tide 2:39 PM (Thu 12 March) 2.55 m
Low Tide 9:07 PM (Thu 12 March) 1.72 m

Tide Times for Conakry, Guinea: Friday 13 March 2026
High Tide 3:18 AM (Fri 13 March) 2.4 m
Low Tide 9:36 AM (Fri 13 March) 1.58 m
High Tide 4:21 PM (Fri 13 March) 2.64 m
Low Tide 10:45 PM (Fri 13 March) 1.59 m

Tide Times for Conakry, Guinea: Saturday 14 March 2026
High Tide 4:51 AM (Sat 14 March) 2.54 m
Low Tide 10:58 AM (Sat 14 March) 1.43 m
High Tide 5:25 PM (Sat 14 March) 2.85 m
Low Tide 11:44 PM (Sat 14 March) 1.36 m

Tide Times for Conakry, Guinea: Sunday 15 March 2026
High Tide 5:46 AM (Sun 15 March) 2.77 m
Low Tide 11:51 AM (Sun 15 March) 1.21 m
High Tide 6:09 PM (Sun 15 March) 3.09 m

Tide Times for Conakry, Guinea: Monday 16 March 2026
Low Tide 00:26 AM (Mon 16 March) 1.1 m
High Tide 6:27 AM (Mon 16 March) 3.01 m
Low Tide 12:33 PM (Mon 16 March) 0.97 m
High Tide 6:46 PM (Mon 16 March) 3.33 m
`;


export function initTides() {
  const container = document.getElementById('tab-tides');
  container.innerHTML = buildTidesHTML();
  bindTideEvents();
  renderContent();
}

function buildTidesHTML() {
  return `
    <h2 style="font-size:24px;font-weight:700;margin-bottom:20px;color:var(--text);">Tide Schedule</h2>

    <div class="location-toggle" id="locationToggle">
      <button class="location-btn active" data-location="Conakry">Conakry</button>
      <button class="location-btn" data-location="Kamsar">Kamsar (Simulated)</button>
    </div>

    <div id="tidesContent"></div>
  `;
}

function bindTideEvents() {
  document.querySelectorAll('.location-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.location-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLocation = btn.dataset.location;
      renderContent();
    });
  });
}

function parseMakeShiftData() {
  const lines = CONAKRY_RAW_DATA.split('\n').map(l => l.trim()).filter(l => l);
  const tides = [];

  // Improved Regex:
  // Matches: "Low Tide 2:06 AM (Tue 17 February) 0.75 m"
  // Also handles potential tabs/spaces variations
  const regex = /^(High Tide|Low Tide)\s+([\d:]+\s+[AP]M)\s+\(([^)]+)\)\s+([\d.]+)\s+m/;

  console.log('Parsing Tides Data:', lines.length, 'lines');

  lines.forEach(line => {
    const match = line.match(regex);
    if (match) {
      tides.push({
        type: match[1],
        time: match[2],
        date: match[3],
        height: parseFloat(match[4])
      });
    } else {
      // Debug unmatched lines (skip headers)
      if (line.includes('Tide') && !line.includes('Times')) {
        console.warn('Unmatched line:', line);
      }
    }
  });
  console.log('Parsed', tides.length, 'tide entries');
  return tides;
}

function renderContent() {
  const container = document.getElementById('tidesContent');

  if (currentLocation === 'Conakry') {
    const tides = parseMakeShiftData();
    const webhookUrl = import.meta.env.VITE_N8N_TIDE_WEBHOOK_URL;

    let screenshotHTML = '';
    if (webhookUrl) {
      // Add cache-busting timestamp to force refresh
      const timestamp = Date.now();
      const screenshotUrl = `${webhookUrl}?t=${timestamp}`;
      screenshotHTML = `
        <div style="margin-bottom: 20px;">
          <h4 style="margin-bottom: 8px; font-size: 16px; color: var(--text);">Tide Conakry</h4>
          <img src="${screenshotUrl}" alt="Tide Conakry" style="width: 100%; height: auto; border-radius: 8px; border: 1px solid #e2e8f0;" onerror="this.parentElement.innerHTML='<p style=\\'color:var(--danger);padding:20px;\\'>Failed to load tide forecast screenshot.</p>';">
        </div>
      `;
    } else {
      screenshotHTML = `
        <div style="margin-bottom: 20px;">
          <p style="color:var(--danger);padding:20px;">n8n Tide Webhook URL not configured. Please set VITE_N8N_TIDE_WEBHOOK_URL in your .env file.</p>
        </div>
      `;
    }

    container.innerHTML = `
            <div class="chart-card">
                 <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <a href="${CONAKRY_TIDE_URL}" target="_blank" style="font-size:12px; color:#4285F4; text-decoration:none;">Open source &rarr;</a>
                </div>

                ${screenshotHTML}

                <div class="tide-table" style="max-height: 600px; overflow-y: auto;">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Height (m)</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                        ${tides.length > 0 ? tides.map(t => `
                            <tr>
                              <td>${t.date}</td>
                              <td>${t.time}</td>
                              <td>${t.height.toFixed(2)}</td>
                              <td><span class="tide-type ${t.type.toLowerCase().replace(' ', '-')}">${t.type}</span></td>
                            </tr>
                        `).join('') : '<tr><td colspan="4">No data parsed. Check format.</td></tr>'}
                    </tbody>
                  </table>
                </div>
            </div>
        `;
  } else {
    // Kamsar - Simulated
    const tides = generateTideData('Kamsar');
    container.innerHTML = `
            <div class="chart-card">
                <h3>Kamsar Tides (Simulated Data)</h3>
                <div class="tide-table">
                  <table>
                    <thead>
                      <tr>
                        <th>DateTime</th>
                        <th>Height (m)</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                        ${tides.map(t => `
                            <tr>
                              <td>${t.dateTime}</td>
                              <td>${t.height.toFixed(2)}</td>
                              <td><span class="tide-type ${t.type.toLowerCase()}">${t.type}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                  </table>
                </div>
            </div>
        `;
  }
}
