// Weather Tab Component
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

let hourlyCharts = {
    kamsar: null,
    conakry: null
};
let weeklyCharts = {
    kamsar: null,
    conakry: null
};
let currentLocation = 'kamsar'; // Default location

const KAMSAR_LAT = 10.51;
const KAMSAR_LON = -14.91;

const CONAKRY_LAT = 9.60;
const CONAKRY_LON = -13.99;

function getAPIUrl(lat, lon) {
    return `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,swell_wave_height,wind_speed_10m,wave_direction,wind_direction_10m&wind_speed_unit=kn&timezone=GMT`;
}

export function initWeather() {
    console.log('initWeather START'); // DEBUG
    const container = document.getElementById('tab-weather');
    if (!container) {
        console.error('tab-weather container NOT found');
        return;
    }

    try {
        container.innerHTML = buildWeatherHTML();
        console.log('weather innerHTML set'); // DEBUG
        bindWeatherEvents();
        fetchAndRenderWeather();
        console.log('initWeather END'); // DEBUG
    } catch (e) {
        console.error('initWeather CRASH:', e);
    }
}

function buildWeatherHTML() {
    return `
    <div class="weather-header">
      <div>
        <div class="weather-location">Marine Weather Forecast</div>
        <div class="weather-location-sub">Live Marine Data (Open-Meteo)</div>
      </div>
      <button class="update-btn" id="weatherUpdateBtn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        Update
      </button>
    </div>

    <div class="weather-tabs">
      <button class="weather-tab active" data-location="kamsar">Kamsar</button>
      <button class="weather-tab" data-location="conakry">Conakry</button>
    </div>

    <div class="weather-content" id="weather-kamsar">
      <div class="chart-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3>Weather Forecast (Buoyweather)</h3>
            <a href="https://www.buoyweather.com/forecast/marine-weather/@${KAMSAR_LAT},${KAMSAR_LON}" target="_blank" style="font-size:12px; color:#4285F4; text-decoration:none;">View full forecast &rarr;</a>
        </div>
        <div id="weatherScreenshot-kamsar" style="min-height:400px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:#f7fafc;">
          <p style="color:var(--text-muted);">Loading forecast...</p>
        </div>
      </div>

      <div class="chart-card">
        <h3>Sea State (Next 24 Hours)</h3>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:4px;">
              <span style="width:12px;height:12px;background:#4285F4;border-radius:3px;"></span>
              <span style="font-size:13px;color:var(--text-muted);">Wave Height (m)</span>
          </div>
          <div style="display:flex;align-items:center;gap:4px;">
              <span style="width:12px;height:12px;background:#34A853;border-radius:3px;"></span>
              <span style="font-size:13px;color:var(--text-muted);">Swell (m)</span>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="hourlyMarineChart-kamsar"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <h3>Wind Forecast (7 Days)</h3>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="width:12px;height:12px;background:#EA4335;border-radius:3px;display:inline-block;"></span>
          <span style="font-size:13px;color:var(--text-muted);">Max Wind Speed (knots)</span>
        </div>
        <div class="chart-container">
          <canvas id="weeklyWindChart-kamsar"></canvas>
        </div>
      </div>
    </div>

    <div class="weather-content" id="weather-conakry" style="display:none;">
      <div class="chart-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3>Weather Forecast (Buoyweather)</h3>
            <a href="https://www.buoyweather.com/forecast/marine-weather/@${CONAKRY_LAT},${CONAKRY_LON}" target="_blank" style="font-size:12px; color:#4285F4; text-decoration:none;">View full forecast &rarr;</a>
        </div>
        <div id="weatherScreenshot-conakry" style="min-height:400px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:#f7fafc;">
          <p style="color:var(--text-muted);">Loading forecast...</p>
        </div>
      </div>

      <div class="chart-card">
        <h3>Sea State (Next 24 Hours)</h3>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:4px;">
              <span style="width:12px;height:12px;background:#4285F4;border-radius:3px;"></span>
              <span style="font-size:13px;color:var(--text-muted);">Wave Height (m)</span>
          </div>
          <div style="display:flex;align-items:center;gap:4px;">
              <span style="width:12px;height:12px;background:#34A853;border-radius:3px;"></span>
              <span style="font-size:13px;color:var(--text-muted);">Swell (m)</span>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="hourlyMarineChart-conakry"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <h3>Wind Forecast (7 Days)</h3>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="width:12px;height:12px;background:#EA4335;border-radius:3px;display:inline-block;"></span>
          <span style="font-size:13px;color:var(--text-muted);">Max Wind Speed (knots)</span>
        </div>
        <div class="chart-container">
          <canvas id="weeklyWindChart-conakry"></canvas>
        </div>
      </div>
    </div>
  `;
}

function bindWeatherEvents() {
    document.getElementById('weatherUpdateBtn').addEventListener('click', () => {
        const btn = document.getElementById('weatherUpdateBtn');
        btn.classList.add('loading');
        fetchAndRenderWeather(currentLocation).finally(() => {
            btn.classList.remove('loading');
        });
    });

    // Tab switching
    document.querySelectorAll('.weather-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const location = tab.dataset.location;
            currentLocation = location;

            // Update active tab
            document.querySelectorAll('.weather-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show selected content
            document.querySelectorAll('.weather-content').forEach(c => c.style.display = 'none');
            document.getElementById(`weather-${location}`).style.display = 'block';

            // Fetch data if not loaded yet
            fetchAndRenderWeather(location);
        });
    });
}

async function fetchAndRenderWeather(location = 'kamsar') {
    try {
        const lat = location === 'kamsar' ? KAMSAR_LAT : CONAKRY_LAT;
        const lon = location === 'kamsar' ? KAMSAR_LON : CONAKRY_LON;
        const apiUrl = getAPIUrl(lat, lon);

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Weather data fetch failed');
        const data = await response.json();

        renderWeatherScreenshot(location, lat, lon);
        renderHourlyMarineChart(data.hourly, location);
        renderWeeklyWindChart(data.hourly, location);
    } catch (error) {
        console.error('Failed to load weather data:', error);
        // Fallback or error UI could go here
    }
}

function renderWeatherScreenshot(location, lat, lon) {
    const container = document.getElementById(`weatherScreenshot-${location}`);
    if (!container) return;

    const apiKey = import.meta.env.VITE_SCREENSHOTMACHINE_API_KEY;

    if (!apiKey) {
        container.innerHTML = '<p style="color:var(--danger);padding:20px;">Screenshot Machine API key not configured. Please set VITE_SCREENSHOTMACHINE_API_KEY environment variable.</p>';
        return;
    }

    const buoyweatherUrl = `https://www.buoyweather.com/forecast/marine-weather/@${lat},${lon}`;
    const encodedUrl = encodeURIComponent(buoyweatherUrl);

    const screenshotUrl = `https://api.screenshotmachine.com?key=${apiKey}&url=${encodedUrl}&dimension=3000x3000&cookies=access_token%3Deefd5e64292369c3aeb0bc73f9414e6808208c99&selector=.wind-wave&cacheLimit=0`;

    container.innerHTML = `
        <img
            src="${screenshotUrl}"
            alt="Buoyweather Forecast"
            style="width:100%; height:auto; border-radius:8px; display:block;"
            onload="this.parentElement.style.background='#ffffff';"
            onerror="this.parentElement.innerHTML='<p style=\\'color:var(--danger);padding:20px;\\'>Failed to load weather forecast screenshot. Please try again later.</p>';"
        />
    `;
}

function renderHourlyMarineChart(hourly, location) {
    const canvas = document.getElementById(`hourlyMarineChart-${location}`);
    if (!canvas) return;
    if (hourlyCharts[location]) hourlyCharts[location].destroy();

    // Take next 24 hours
    const labels = hourly.time.slice(0, 24).map(t => t.slice(11, 16)); // HH:MM
    const waveHeight = hourly.wave_height.slice(0, 24);
    const swellHeight = hourly.swell_wave_height.slice(0, 24);

    hourlyCharts[location] = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Wave Height (m)',
                    data: waveHeight,
                    borderColor: '#4285F4',
                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Swell (m)',
                    data: swellHeight,
                    borderColor: '#34A853',
                    backgroundColor: 'rgba(52, 168, 83, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#F0F0F0' },
                    title: { display: true, text: 'Meters' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderWeeklyWindChart(hourly, location) {
    const canvas = document.getElementById(`weeklyWindChart-${location}`);
    if (!canvas) return;
    if (weeklyCharts[location]) weeklyCharts[location].destroy();

    // Aggregate hourly wind to daily max
    const dailyLabels = [];
    const dailyMaxWind = [];

    // Process 7 days (7 * 24 = 168 hours)
    for (let i = 0; i < 7; i++) {
        const start = i * 24;
        const end = start + 24;
        const daySlice = hourly.wind_speed_10m.slice(start, end);
        if (daySlice.length === 0) break;

        const maxWind = Math.max(...daySlice);
        dailyMaxWind.push(maxWind);

        // Date format
        const dateStr = hourly.time[start].slice(0, 10);
        dailyLabels.push(new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }));
    }

    weeklyCharts[location] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: dailyLabels,
            datasets: [{
                label: 'Max Wind (kn)',
                data: dailyMaxWind,
                backgroundColor: '#EA4335',
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.parsed.y} knots`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#F0F0F0' },
                    title: { display: true, text: 'Knots' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}


