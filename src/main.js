// Main entry point
import { initTimesheet, closePanel, handleFormSubmit, refreshTimesheet } from './components/timesheet.js';
import { initDashboard, refreshDashboard } from './components/dashboard.js';
import { initWeather } from './components/weather.js';
import { initTides } from './components/tides.js';
import { initAdmin } from './components/admin.js';
import { getUsers } from './data/adminLists.js';
import { getCurrentUser, setCurrentUser } from './data/store.js';

// Initialize all tabs
document.addEventListener('DOMContentLoaded', () => {
    initUserSwitcher();
    initTimesheet();
    initDashboard();
    initWeather();
    initTides();
    initAdmin();

    // Tab navigation
    setupTabNavigation();

    // Panel events
    setupPanelEvents();
});

function initUserSwitcher() {
    const container = document.querySelector('.nav-right');
    if (!container) return;

    const render = () => {
        const users = getUsers();
        let currentUser = getCurrentUser();

        if (!currentUser && users.length > 0) {
            currentUser = users[0];
            setCurrentUser(currentUser);
        }

        if (!currentUser) return;

        container.innerHTML = `
            <select id="userSwitcher" title="Switch User" style="padding:4px 8px; border-radius:16px; border:1px solid #e2e8f0; font-size:12px; background:white; cursor:pointer;">
                ${users.map(u => `<option value="${u.name}" ${u.name === currentUser.name ? 'selected' : ''}>${u.name} (${u.role})</option>`).join('')}
            </select>
        `;

        document.getElementById('userSwitcher').addEventListener('change', (e) => {
            const u = users.find(user => user.name === e.target.value);
            if (u) {
                setCurrentUser(u);
                // Reload to refresh all components transparently
                window.location.reload();
            }
        });
    };

    render();
}

function setupTabNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show target content
            contents.forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-${target}`).classList.add('active');

            // Refresh data when switching tabs
            if (target === 'dashboard') {
                refreshDashboard();
            }
            if (target === 'timesheet') {
                refreshTimesheet();
            }
        });
    });
}

function setupPanelEvents() {
    // Close panel
    document.getElementById('panelClose').addEventListener('click', closePanel);
    document.getElementById('formCancel').addEventListener('click', closePanel);

    // Close on overlay click (outside panel)
    document.getElementById('panelOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closePanel();
    });

    // Form submit
    document.getElementById('entryForm').addEventListener('submit', (e) => {
        handleFormSubmit(e);
    });

    // Escape key closes panel
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePanel();
    });
}
