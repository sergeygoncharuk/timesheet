// Data store — Airtable-backed with localStorage cache
import {
    fetchRecordsForVesselDate,
    createRecord,
    updateRecord as airtableUpdate,
    deleteRecord as airtableDelete
} from './airtable.js';

const CACHE_KEY = 'lte_timesheet_cache';

// Local cache for fast reads
function getCache() {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
}

function setCache(entries) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
}

function updateCacheEntry(entry) {
    const cache = getCache();
    const idx = cache.findIndex(e => e.id === entry.id);
    if (idx !== -1) {
        cache[idx] = entry;
    } else {
        cache.push(entry);
    }
    setCache(cache);
}

function removeCacheEntry(id) {
    setCache(getCache().filter(e => e.id !== id));
}

// ============================================
// Public API — async, Airtable-first
// ============================================

export const TAGS = [
    { name: 'Mooring', color: '#cbd5e0' }, // gray-300
    { name: 'Drifting', color: '#81e6d9' }, // teal-200
    { name: 'Waiting', color: '#f6ad55' }, // orange-300
    { name: 'Bunkering', color: '#9f7aea' }, // purple-400
    { name: 'Transit', color: '#48bb78' }, // green-400
    { name: 'Construct', color: '#f56565' }, // red-400
    { name: 'Survey', color: '#4299e1' }, // blue-400
    { name: 'Weather Delay', color: '#f56565' }, // red-400 (same as Construct/Safety)
    { name: 'Maintenance', color: '#a0aec0' }, // gray-400
    { name: 'Supply', color: '#ed8936' }, // orange-400
    { name: 'Others', color: '#ecc94b' }  // yellow-400
];

// Shared State — restore saved user from localStorage if available
let currentUser = (() => {
    try {
        const saved = localStorage.getItem('lte_current_user');
        if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return null;
})();
let currentDateOffset = 0; // Shared date offset for Timesheet and Dashboard

export function getCurrentUser() { return currentUser; }
export function setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('lte_current_user', JSON.stringify(user));
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('userChanged', { detail: user }));
}

export function getDateOffset() { return currentDateOffset; }
export function setDateOffset(offset) { currentDateOffset = offset; }

// Fetch entries for a vessel on a date (from Airtable, updates cache)
export async function getEntriesForVesselDate(vessel, dateStr) {
    try {
        const entries = await fetchRecordsForVesselDate(vessel, dateStr);
        // Preserve any locally-saved pending entries that haven't synced yet
        const pending = getCache().filter(e => e.vessel === vessel && e.date === dateStr && e._pendingSync);
        const others = getCache().filter(e => !(e.vessel === vessel && e.date === dateStr));
        others.push(...entries, ...pending);
        setCache(others);
        return [...entries, ...pending];
    } catch (err) {
        console.warn('Airtable fetch failed, using cache:', err.message);
        return getCache().filter(e => e.vessel === vessel && e.date === dateStr);
    }
}

// Add a new entry
export async function addEntry(entryData) {
    try {
        const entry = await createRecord(entryData);
        updateCacheEntry(entry);
        return { entry, error: null };
    } catch (err) {
        console.error('Airtable create failed:', err.message);
        // Fallback: save locally with temp ID so data isn't lost
        const fallback = {
            ...entryData,
            id: 'local_' + Date.now().toString(36),
            _pendingSync: true
        };
        updateCacheEntry(fallback);
        return { entry: fallback, error: err.message };
    }
}

// Update an existing entry
export async function updateEntry(id, updates) {
    try {
        const entry = await airtableUpdate(id, updates);
        updateCacheEntry(entry);
        return { entry, error: null };
    } catch (err) {
        console.error('Airtable update failed:', err.message);
        const cache = getCache();
        const idx = cache.findIndex(e => e.id === id);
        if (idx !== -1) {
            cache[idx] = { ...cache[idx], ...updates };
            setCache(cache);
            return { entry: cache[idx], error: err.message };
        }
        return { entry: null, error: err.message };
    }
}

// Delete an entry
export async function deleteEntry(id) {
    // Local-only pending entries can be removed without an Airtable call
    if (id.startsWith('local_')) {
        removeCacheEntry(id);
        return;
    }
    try {
        await airtableDelete(id);
        removeCacheEntry(id);
    } catch (err) {
        console.error('Airtable delete failed:', err.message);
        removeCacheEntry(id);
    }
}

// ============================================
// Time utilities (unchanged)
// ============================================

export function parseTime(hhmm) {
    const str = hhmm.padStart(4, '0');
    return {
        hours: parseInt(str.slice(0, 2), 10),
        minutes: parseInt(str.slice(2, 4), 10)
    };
}

export function calcDuration(startHhmm, endHhmm) {
    const s = parseTime(startHhmm);
    const e = parseTime(endHhmm);
    let startMin = s.hours * 60 + s.minutes;
    let endMin = e.hours * 60 + e.minutes;
    if (endMin < startMin) endMin += 1440;
    return endMin - startMin;
}

export function formatDuration(minutes) {
    let h = Math.floor(minutes / 60);
    let m = minutes % 60;

    // Round 23h 59m to 24h
    if (h === 23 && m === 59) {
        h = 24;
        m = 0;
    }

    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

export function formatTime(hhmm) {
    const str = hhmm.padStart(4, '0');
    return `${str.slice(0, 2)}:${str.slice(2, 4)}`;
}

export function getDateStr(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
}

export function formatDateDisplay(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    return `${day} ${month}`;
}
