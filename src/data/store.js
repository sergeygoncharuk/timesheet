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

// User Session Management
let currentUser = null;

export function getCurrentUser() {
    if (!currentUser) {
        const stored = localStorage.getItem('lte_current_user');
        if (stored) {
            currentUser = JSON.parse(stored);
        } else {
            // Default to first user from admin list if available
            // This requires importing getUsers, but to avoid circular deps we'll handle it in init
        }
    }
    return currentUser;
}

export function setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('lte_current_user', JSON.stringify(user));
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('userChanged', { detail: user }));
}

// Fetch entries for a vessel on a date (from Airtable, updates cache)
export async function getEntriesForVesselDate(vessel, dateStr) {
    try {
        const entries = await fetchRecordsForVesselDate(vessel, dateStr);
        // Update local cache with fetched entries
        const cache = getCache().filter(e => !(e.vessel === vessel && e.date === dateStr));
        cache.push(...entries);
        setCache(cache);
        return entries;
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
        return entry;
    } catch (err) {
        console.error('Airtable create failed:', err.message);
        // Fallback: save locally with temp ID
        const fallback = {
            ...entryData,
            id: 'local_' + Date.now().toString(36),
            _pendingSync: true
        };
        updateCacheEntry(fallback);
        return fallback;
    }
}

// Update an existing entry
export async function updateEntry(id, updates) {
    try {
        const entry = await airtableUpdate(id, updates);
        updateCacheEntry(entry);
        return entry;
    } catch (err) {
        console.error('Airtable update failed:', err.message);
        const cache = getCache();
        const idx = cache.findIndex(e => e.id === id);
        if (idx !== -1) {
            cache[idx] = { ...cache[idx], ...updates };
            setCache(cache);
            return cache[idx];
        }
        return null;
    }
}

// Delete an entry
export async function deleteEntry(id) {
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
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
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
