// Weather Tab Component
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

let hourlyChart = null;
let weeklyChart = null;

const KAMSAR_LAT = 10.51;
const KAMSAR_LON = -14.91;
const API_URL = `https://marine-api.open-meteo.com/v1/marine?latitude=${KAMSAR_LAT}&longitude=${KAMSAR_LON}&hourly=wave_height,swell_wave_height,wind_speed_10m,wave_direction,wind_direction_10m&wind_speed_unit=kn&timezone=GMT`;

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
        <div class="weather-location">Kamsar (10.51°N, 14.91°W)</div>
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

    <div class="chart-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3>Weather Forecast (Today & Tomorrow)</h3>
          <a href="https://www.buoyweather.com/forecast/marine-weather/print/charts/@10.51,-14.91" target="_blank" style="font-size:12px; color:#4285F4; text-decoration:none;">View Buoyweather &rarr;</a>
      </div>
      <div id="forecastTable" style="overflow-x:auto;"></div>
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
        <canvas id="hourlyMarineChart"></canvas>
      </div>
    </div>

    <div class="chart-card">
      <h3>Wind Forecast (7 Days)</h3>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="width:12px;height:12px;background:#EA4335;border-radius:3px;display:inline-block;"></span>
        <span style="font-size:13px;color:var(--text-muted);">Max Wind Speed (knots)</span>
      </div>
      <div class="chart-container">
        <canvas id="weeklyWindChart"></canvas>
      </div>
    </div>
  `;
}

function bindWeatherEvents() {
    document.getElementById('weatherUpdateBtn').addEventListener('click', () => {
        const btn = document.getElementById('weatherUpdateBtn');
        btn.classList.add('loading');
        fetchAndRenderWeather().finally(() => {
            btn.classList.remove('loading');
        });
    });
}

async function fetchAndRenderWeather() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Weather data fetch failed');
        const data = await response.json();

        renderForecastTable(data.hourly);
        renderHourlyMarineChart(data.hourly);
        renderWeeklyWindChart(data.hourly);
    } catch (error) {
        console.error('Failed to load weather data:', error);
        // Fallback or error UI could go here
    }
}

function renderForecastTable(hourly) {
    const container = document.getElementById('forecastTable');
    if (!container) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get indices for today and tomorrow (8 periods each: 12am, 3am, 6am, 9am, 12pm, 3pm, 6pm, 9pm)
    const todayData = getDataForDay(hourly, today);
    const tomorrowData = getDataForDay(hourly, tomorrow);

    if (!todayData.length && !tomorrowData.length) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">No forecast data available</p>';
        return;
    }

    container.innerHTML = `
        <table class="forecast-table">
            <thead>
                <tr>
                    <th rowspan="2" style="border-right:2px solid #e2e8f0;">Time</th>
                    ${todayData.length ? `<th colspan="8" style="border-right:2px solid #e2e8f0;">${formatDayHeader(today)}</th>` : ''}
                    ${tomorrowData.length ? `<th colspan="8">${formatDayHeader(tomorrow)}</th>` : ''}
                </tr>
                <tr>
                    ${todayData.map(d => `<th>${d.hour}</th>`).join('')}
                    ${todayData.length ? '<th style="border-right:2px solid #e2e8f0;width:0;"></th>' : ''}
                    ${tomorrowData.map(d => `<th>${d.hour}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="label-cell">Wind Speed<br><span style="font-size:11px;color:var(--text-muted);">(knots)</span></td>
                    ${todayData.map(d => `<td>${renderWindBar(d.windSpeed)}<br>${Math.round(d.windSpeed)}</td>`).join('')}
                    ${todayData.length ? '<td style="border-right:2px solid #e2e8f0;"></td>' : ''}
                    ${tomorrowData.map(d => `<td>${renderWindBar(d.windSpeed)}<br>${Math.round(d.windSpeed)}</td>`).join('')}
                </tr>
                <tr>
                    <td class="label-cell">Wind Dir</td>
                    ${todayData.map(d => `<td>${renderDirection(d.windDir)}</td>`).join('')}
                    ${todayData.length ? '<td style="border-right:2px solid #e2e8f0;"></td>' : ''}
                    ${tomorrowData.map(d => `<td>${renderDirection(d.windDir)}</td>`).join('')}
                </tr>
                <tr>
                    <td class="label-cell">Wave Height<br><span style="font-size:11px;color:var(--text-muted);">(meters)</span></td>
                    ${todayData.map(d => `<td>${renderWaveBar(d.waveHeight)}<br>${d.waveHeight.toFixed(1)}</td>`).join('')}
                    ${todayData.length ? '<td style="border-right:2px solid #e2e8f0;"></td>' : ''}
                    ${tomorrowData.map(d => `<td>${renderWaveBar(d.waveHeight)}<br>${d.waveHeight.toFixed(1)}</td>`).join('')}
                </tr>
                <tr>
                    <td class="label-cell">Wave Dir</td>
                    ${todayData.map(d => `<td>${renderDirection(d.waveDir)}</td>`).join('')}
                    ${todayData.length ? '<td style="border-right:2px solid #e2e8f0;"></td>' : ''}
                    ${tomorrowData.map(d => `<td>${renderDirection(d.waveDir)}</td>`).join('')}
                </tr>
            </tbody>
        </table>
    `;
}

function getDataForDay(hourly, date) {
    const data = [];
    const hours = [0, 3, 6, 9, 12, 15, 18, 21]; // 8 periods per day

    for (let h of hours) {
        const targetTime = new Date(date);
        targetTime.setHours(h, 0, 0, 0);
        const timeStr = targetTime.toISOString().slice(0, 13) + ':00';

        const index = hourly.time.indexOf(timeStr);
        if (index !== -1) {
            data.push({
                hour: h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`,
                windSpeed: hourly.wind_speed_10m[index] || 0,
                windDir: hourly.wind_direction_10m[index] || 0,
                waveHeight: hourly.wave_height[index] || 0,
                waveDir: hourly.wave_direction[index] || 0
            });
        }
    }
    return data;
}

function formatDayHeader(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[date.getDay()]} ${date.getMonth()+1}/${date.getDate()}`;
}

function renderWindBar(speed) {
    const maxHeight = 40;
    const height = Math.min((speed / 30) * maxHeight, maxHeight);
    return `<div style="width:30px;height:${maxHeight}px;display:flex;align-items:flex-end;margin:0 auto;"><div style="width:100%;height:${height}px;background:#4A90E2;border-radius:2px;"></div></div>`;
}

function renderWaveBar(height) {
    const maxBarHeight = 40;
    const barHeight = Math.min((height / 3) * maxBarHeight, maxBarHeight);
    return `<div style="width:30px;height:${maxBarHeight}px;display:flex;align-items:flex-end;margin:0 auto;"><div style="width:100%;height:${barHeight}px;background:#5B9BD5;border-radius:2px;"></div></div>`;
}

function renderDirection(degrees) {
    const arrows = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
    const index = Math.round(degrees / 45) % 8;
    return `<span style="font-size:18px;">${arrows[index]}</span>`;
}

function renderHourlyMarineChart(hourly) {
    const canvas = document.getElementById('hourlyMarineChart');
    if (!canvas) return;
    if (hourlyChart) hourlyChart.destroy();

    // Take next 24 hours
    const labels = hourly.time.slice(0, 24).map(t => t.slice(11, 16)); // HH:MM
    const waveHeight = hourly.wave_height.slice(0, 24);
    const swellHeight = hourly.swell_wave_height.slice(0, 24);

    hourlyChart = new Chart(canvas, {
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

function renderWeeklyWindChart(hourly) {
    const canvas = document.getElementById('weeklyWindChart');
    if (!canvas) return;
    if (weeklyChart) weeklyChart.destroy();

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

    weeklyChart = new Chart(canvas, {
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


