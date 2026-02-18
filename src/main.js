// Main entry point
import { initTimesheet, closePanel, handleFormSubmit, refreshTimesheet } from './components/timesheet.js';
import { initDashboard, refreshDashboard } from './components/dashboard.js';
import { initWeather } from './components/weather.js';
import { initTides } from './components/tides.js';
import { initAdmin } from './components/admin.js';
import { getUsers, isAuthRequired, getUserByEmail } from './data/adminLists.js';
import { getCurrentUser, setCurrentUser } from './data/store.js';

const AUTH_KEY = 'lte_auth_session';

// Initialize all tabs
document.addEventListener('DOMContentLoaded', () => {
    if (isAuthRequired() && !isAuthenticated()) {
        showLoginScreen();
        return;
    }
    bootApp();
});

function bootApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = '';

    initUserSwitcher();
    updateAdminTabVisibility();
    initTimesheet();
    initDashboard();
    initWeather();
    initTides();
    initAdmin();

    // Tab navigation
    setupTabNavigation();

    // Panel events
    setupPanelEvents();
}

function isAuthenticated() {
    try {
        const session = JSON.parse(sessionStorage.getItem(AUTH_KEY));
        if (!session || !session.email) return false;
        // Verify user still exists
        const user = getUserByEmail(session.email);
        return !!user;
    } catch { return false; }
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';

    const emailInput = document.getElementById('loginEmail');
    const otpInput = document.getElementById('loginOtp');
    const loginBtn = document.getElementById('loginBtn');
    const errorEl = document.getElementById('loginError');

    loginBtn.onclick = attemptLogin;
    otpInput.onkeydown = (e) => { if (e.key === 'Enter') attemptLogin(); };

    function attemptLogin() {
        errorEl.style.display = 'none';
        const email = emailInput.value.trim();
        const otp = otpInput.value.trim();

        if (!email || !otp) {
            errorEl.textContent = 'Please enter email and OTP.';
            errorEl.style.display = 'block';
            return;
        }

        const user = getUserByEmail(email);
        if (!user) {
            errorEl.textContent = 'User not found.';
            errorEl.style.display = 'block';
            return;
        }

        if (user.otp !== otp) {
            errorEl.textContent = 'Invalid OTP code.';
            errorEl.style.display = 'block';
            return;
        }

        sessionStorage.setItem(AUTH_KEY, JSON.stringify({ email: user.email, name: user.name }));
        setCurrentUser(user);
        bootApp();
    }
}

function initUserSwitcher() {
    const container = document.querySelector('.nav-right');
    if (!container) return;

    const users = getUsers();
    let currentUser = getCurrentUser();

    if (!currentUser && users.length > 0) {
        currentUser = users[0];
        setCurrentUser(currentUser);
    }

    if (!currentUser) return;

    const initial = currentUser.name.charAt(0).toUpperCase();

    container.innerHTML = `
        <div class="user-menu-wrapper">
            <button class="user-avatar" id="userAvatarBtn">${initial}</button>
            <div class="user-dropdown" id="userDropdown">
                <div class="user-dropdown-profile">
                    <div class="user-dropdown-avatar">${initial}</div>
                    <div class="user-dropdown-info">
                        <div class="user-dropdown-name">${currentUser.name}</div>
                        <div class="user-dropdown-email">${currentUser.email || 'No email'}</div>
                        <span class="user-role-badge ${currentUser.role.toLowerCase().replace(' ', '-')}">${currentUser.role}</span>
                    </div>
                </div>
                ${users.length > 1 ? `
                <div class="user-dropdown-divider"></div>
                <div class="user-dropdown-section-label">Switch User</div>
                ${users.filter(u => u.name !== currentUser.name).map(u => `
                    <button class="user-dropdown-item switch-user" data-name="${u.name}">
                        <span class="user-dropdown-item-avatar">${u.name.charAt(0).toUpperCase()}</span>
                        <span>${u.name}</span>
                        <span class="user-dropdown-item-role">${u.role}</span>
                    </button>
                `).join('')}
                ` : ''}
                <div class="user-dropdown-divider"></div>
                <button class="user-dropdown-item user-dropdown-logout" id="logoutBtn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    <span>Logout</span>
                </button>
            </div>
        </div>
    `;

    const avatarBtn = document.getElementById('userAvatarBtn');
    const dropdown = document.getElementById('userDropdown');

    avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== avatarBtn) {
            dropdown.classList.remove('open');
        }
    });

    dropdown.querySelectorAll('.switch-user').forEach(btn => {
        btn.addEventListener('click', () => {
            const u = users.find(user => user.name === btn.dataset.name);
            if (u) {
                setCurrentUser(u);
                window.location.reload();
            }
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem(AUTH_KEY);
        localStorage.removeItem('lte_current_user');
        window.location.reload();
    });
}

function updateAdminTabVisibility() {
    const user = getCurrentUser();
    const isAdmin = user && user.role && user.role.toLowerCase() === 'admin';
    const adminTab = document.querySelector('[data-tab="admin"]');
    const adminContent = document.getElementById('tab-admin');
    if (adminTab) adminTab.style.display = isAdmin ? '' : 'none';
    if (adminContent) adminContent.style.display = isAdmin ? '' : 'none';
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
