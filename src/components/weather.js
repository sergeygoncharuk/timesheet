// Weather Tab Component
let currentLocation = 'kamsar'; // Default location

const KAMSAR_LAT = 10.51;
const KAMSAR_LON = -14.91;

const CONAKRY_LAT = 9.60;
const CONAKRY_LON = -13.99;

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
            <a href="https://www.buoyweather.com/forecast/marine-weather/@${KAMSAR_LAT},${KAMSAR_LON}" target="_blank" style="font-size:12px; color:#4285F4; text-decoration:none;">Open source &rarr;</a>
        </div>
        <div id="weatherScreenshot-kamsar" style="min-height:400px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:#f7fafc;">
          <p style="color:var(--text-muted);">Loading forecast...</p>
        </div>
      </div>
    </div>

    <div class="weather-content" id="weather-conakry" style="display:none;">
      <div class="chart-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3>Weather Forecast (Buoyweather)</h3>
            <a href="https://www.buoyweather.com/forecast/marine-weather/@${CONAKRY_LAT},${CONAKRY_LON}" target="_blank" style="font-size:12px; color:#4285F4; text-decoration:none;">Open source &rarr;</a>
        </div>
        <div id="weatherScreenshot-conakry" style="min-height:400px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:#f7fafc;">
          <p style="color:var(--text-muted);">Loading forecast...</p>
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

        renderWeatherScreenshot(location, lat, lon);
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


