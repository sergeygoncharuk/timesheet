// Dynamic admin lists stored in localStorage
// These are the single source of truth for Vessels, Users, and Tags

const STORAGE_KEY = 'admin_lists';

const DEFAULT_LISTS = {
    vessels: ['Aegir', 'Afina', 'Barla', 'Dian Dian', 'Ilker Deniz', 'Nimba-1', 'Nimba-2', 'Nimba-3', 'Nimba-4'],
    users: [{ name: 'Sergey', email: '', role: 'Admin' }],
    tags: [
        { name: 'Cargo Ops', color: '#4299e1' },
        { name: 'Waiting', color: '#ed8936' },
        { name: 'Transit', color: '#48bb78' },
        { name: 'Maintenance', color: '#a0aec0' },
        { name: 'Bunkering', color: '#9f7aea' },
        { name: 'Anchored', color: '#ed64a6' },
        { name: 'Weather Delay', color: '#f56565' },
        { name: 'Port Stay', color: '#ecc94b' },
        { name: 'Other', color: '#718096' }
    ]
};

function loadLists() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            // Migration: Users
            if (parsed.users && parsed.users.length > 0 && typeof parsed.users[0] === 'string') {
                parsed.users = parsed.users.map(u => ({ name: u, email: '', role: 'Vessel' }));
            }
            // Migration: Tags
            if (parsed.tags && parsed.tags.length > 0 && typeof parsed.tags[0] === 'string') {
                const defaults = DEFAULT_LISTS.tags;
                parsed.tags = parsed.tags.map(t => {
                    const def = defaults.find(d => d.name === t);
                    return { name: t, color: def ? def.color : '#cbd5e0' };
                });
            }
            return { ...DEFAULT_LISTS, ...parsed };
        }
    } catch (e) {
        console.warn('Failed to load admin lists:', e);
    }
    return { ...DEFAULT_LISTS };
}

function saveLists(lists) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

// --- Public API ---

export function getVessels() {
    return loadLists().vessels;
}

export function getUsers() {
    return loadLists().users;
}

export function getTags() {
    return loadLists().tags;
}

export function addItem(listName, value) {
    const lists = loadLists();
    if (!lists[listName]) return false;
    const trimmed = value.trim();
    if (listName === 'tags') {
        // Should use addTag instead
        return addTag({ name: trimmed, color: '#cbd5e0' });
    }
    if (!trimmed || lists[listName].includes(trimmed)) return false;
    lists[listName].push(trimmed);
    saveLists(lists);
    return true;
}

export function removeItem(listName, value) {
    const lists = loadLists();
    if (!lists[listName]) return false;
    if (listName === 'tags') {
        return removeTag(value);
    }
    lists[listName] = lists[listName].filter(v => v !== value);
    saveLists(lists);
    return true;
}

export function renameItem(listName, oldValue, newValue) {
    const lists = loadLists();
    if (!lists[listName]) return false;
    if (listName === 'tags') {
        return updateTag(oldValue, { name: newValue });
    }
    const trimmed = newValue.trim();
    if (!trimmed) return false;
    const idx = lists[listName].indexOf(oldValue);
    if (idx === -1) return false;
    lists[listName][idx] = trimmed;
    saveLists(lists);
    return true;
}


export function moveItem(listName, fromIndex, toIndex) {
    const lists = loadLists();
    if (!lists[listName]) return false;

    // Bounds check
    if (fromIndex < 0 || fromIndex >= lists[listName].length ||
        toIndex < 0 || toIndex >= lists[listName].length) {
        return false;
    }

    const item = lists[listName].splice(fromIndex, 1)[0];
    lists[listName].splice(toIndex, 0, item);
    saveLists(lists);
    return true;
}

// --- User/Tag Specific API ---

// ... Users (omitted for brevity, assume they exist or are below) ...
export function addUser(user) {
    const lists = loadLists();
    if (!user.name) return false;
    if (lists.users.some(u => u.name.toLowerCase() === user.name.trim().toLowerCase())) {
        return false;
    }
    lists.users.push({
        name: user.name.trim(),
        email: user.email ? user.email.trim() : '',
        role: user.role || 'Vessel'
    });
    saveLists(lists);
    return true;
}

export function removeUser(name) {
    const lists = loadLists();
    const initLen = lists.users.length;
    lists.users = lists.users.filter(u => u.name !== name);
    if (lists.users.length !== initLen) {
        saveLists(lists);
        return true;
    }
    return false;
}

export function updateUser(oldName, updatedUser) {
    const lists = loadLists();
    const idx = lists.users.findIndex(u => u.name === oldName);
    if (idx === -1) return false;

    if (updatedUser.name && updatedUser.name !== oldName) {
        if (lists.users.some(u => u.name.toLowerCase() === updatedUser.name.trim().toLowerCase())) {
            return false;
        }
    }

    lists.users[idx] = {
        ...lists.users[idx],
        ...updatedUser,
        name: updatedUser.name ? updatedUser.name.trim() : lists.users[idx].name
    };
    saveLists(lists);
    return true;
}

export function addTag(tag) {
    const lists = loadLists();
    if (!tag.name) return false;
    if (lists.tags.some(t => t.name.toLowerCase() === tag.name.trim().toLowerCase())) {
        return false;
    }
    lists.tags.push({
        name: tag.name.trim(),
        color: tag.color || '#cbd5e0'
    });
    saveLists(lists);
    return true;
}

export function removeTag(name) {
    const lists = loadLists();
    const initLen = lists.tags.length;
    lists.tags = lists.tags.filter(t => t.name !== name);
    if (lists.tags.length !== initLen) {
        saveLists(lists);
        return true;
    }
    return false;
}

export function updateTag(oldName, updatedTag) {
    const lists = loadLists();
    const idx = lists.tags.findIndex(t => t.name === oldName);
    if (idx === -1) return false;

    if (updatedTag.name && updatedTag.name !== oldName) {
        if (lists.tags.some(t => t.name.toLowerCase() === updatedTag.name.trim().toLowerCase())) {
            return false;
        }
    }

    lists.tags[idx] = {
        ...lists.tags[idx],
        ...updatedTag,
        name: updatedTag.name ? updatedTag.name.trim() : lists.tags[idx].name
    };
    saveLists(lists);
    return true;
}
