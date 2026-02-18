import { fetchUsersFromAirtable, pushUserToAirtable, updateUserInAirtable, deleteUserFromAirtable, fetchVesselsFromAirtable, pushVesselToAirtable, updateVesselInAirtable, deleteVesselFromAirtable, fetchTagsFromAirtable, pushTagToAirtable, updateTagInAirtable, deleteTagFromAirtable } from './airtable.js';

const STORAGE_KEY = 'admin_lists';

const DEFAULT_LISTS = {
    vessels: ['Aegir', 'Afina', 'Barla', 'Dian Dian', 'Ilker Deniz', 'Nimba-1', 'Nimba-2', 'Nimba-3', 'Nimba-4'],
    users: [{ name: 'Sergey', email: 'sg@lei-teng.com', role: 'Admin' }],
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
            // Migration: Patch default admin email if blank
            if (parsed.users) {
                parsed.users = parsed.users.map(u =>
                    (u.name === 'Sergey' && !u.email) ? { ...u, email: 'sg@lei-teng.com' } : u
                );
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

    if (listName === 'vessels') {
        // Optimistic update + Async Push
        pushVesselToAirtable(trimmed).catch(e => console.error('Failed to push vessel:', e));
    }

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
    if (listName === 'vessels') {
        fetchVesselsFromAirtable().then(vessels => {
            const match = vessels.find(v => v.name === value);
            if (match) deleteVesselFromAirtable(match.airtableId);
        }).catch(e => console.error('Failed to delete vessel from Airtable:', e));
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

    if (listName === 'vessels') {
        fetchVesselsFromAirtable().then(vessels => {
            const match = vessels.find(v => v.name === oldValue);
            if (match) updateVesselInAirtable(match.airtableId, trimmed);
        }).catch(e => console.error('Failed to rename vessel in Airtable:', e));
    }

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
// --- Async User API (Airtable-backed) ---

export async function syncUsers() {
    try {
        const users = await fetchUsersFromAirtable();
        const lists = loadLists();

        // Merge strategy: Airtable is truth. 
        // But we might want to preserve local-only fields if any (like OTP? No, OTP is likely simpler to keep local or sync if field exists)
        // For now, replace local users with Airtable users

        // Map Airtable records to our internal format
        lists.users = users.map(u => ({
            name: u.name,
            email: u.email,
            role: u.role,
            id: u.airtableId, // Store ID for updates
            otp: u.otp || '',
            sortId: u.sortId
            // Since OTP isn't in Airtable, we lose it on sync unless we merge.
            // For now, let's just use Airtable data.
        }));

        // Sort by ID
        lists.users.sort((a, b) => a.sortId - b.sortId);

        saveLists(lists);
        return lists.users;
    } catch (e) {
        console.error('Failed to sync users:', e);
        return getUsers(); // Return cached
    }
}


export async function syncVessels() {
    try {
        const records = await fetchVesselsFromAirtable();
        const lists = loadLists();
        // Replace local vessels with Airtable names
        lists.vessels = records.map(r => r.name).filter(n => n.trim().length > 0);

        // Remove duplicates and sort
        lists.vessels = [...new Set(lists.vessels)].sort();

        saveLists(lists);
        return lists.vessels;
    } catch (e) {
        console.error('Failed to sync vessels:', e);
        return getVessels();
    }
}

export async function syncTags() {
    try {
        const records = await fetchTagsFromAirtable();
        const lists = loadLists();

        // Map Airtable records to local tag objects
        // Use Name and Color from Airtable
        lists.tags = records.map(r => ({
            name: r.name,
            color: r.color
        }));

        // Remove duplicates (by name) just in case, though Airtable IDs are unique
        // Here we filter by unique name to avoid UI issues
        const uniqueTags = [];
        const seenNames = new Set();
        for (const t of lists.tags) {
            const k = t.name.toLowerCase().trim();
            if (!seenNames.has(k)) {
                seenNames.add(k);
                uniqueTags.push(t);
            }
        }
        lists.tags = uniqueTags;

        saveLists(lists);
        return lists.tags;
    } catch (e) {
        console.error('Failed to sync tags:', e);
        return getTags();
    }
}

export async function addUser(user) {
    const lists = loadLists();
    if (!user.name) return false;

    // Check duplicate locally first
    if (lists.users.some(u => u.name.toLowerCase() === user.name.trim().toLowerCase())) {
        return false;
    }

    try {
        const newRecord = await pushUserToAirtable(user);
        lists.users.push({
            name: newRecord.fields.Name,
            email: newRecord.fields.Email || '',
            role: newRecord.fields.Role || 'Vessel',
            id: newRecord.id
        });
        saveLists(lists);
        return true;
    } catch (e) {
        console.error('Add user failed:', e);
        return false;
    }
}

export async function removeUser(name) {
    const lists = loadLists();
    const user = lists.users.find(u => u.name === name);
    if (!user) return false;

    // If user has no ID (legacy local), just remove locally
    if (!user.id) {
        lists.users = lists.users.filter(u => u.name !== name);
        saveLists(lists);
        return true;
    }

    try {
        await deleteUserFromAirtable(user.id);
        lists.users = lists.users.filter(u => u.name !== name);
        saveLists(lists);
        return true;
    } catch (e) {
        console.error('Delete user failed:', e);
        return false;
    }
}

export async function updateUser(oldName, updatedUser) {
    const lists = loadLists();
    const idx = lists.users.findIndex(u => u.name === oldName);
    if (idx === -1) return false;

    const currentUser = lists.users[idx];

    if (updatedUser.name && updatedUser.name !== oldName) {
        if (lists.users.some(u => u.name.toLowerCase() === updatedUser.name.trim().toLowerCase())) {
            return false;
        }
    }



    if (!currentUser.id) {
        // Local only user (legacy) -> update locally
        lists.users[idx] = {
            ...currentUser,
            ...updatedUser,
            name: updatedUser.name ? updatedUser.name.trim() : currentUser.name
        };
        saveLists(lists);
        return true;
    }

    try {
        await updateUserInAirtable(currentUser.id, updatedUser);
        lists.users[idx] = {
            ...currentUser,
            ...updatedUser,
            name: updatedUser.name ? updatedUser.name.trim() : currentUser.name
        };
        saveLists(lists);
        return true;
    } catch (e) {
        console.error('Update user failed:', e);
        return false;
    }
}

export async function generateOtp(userName) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    // OTP is local-only for now, so we use the local update logic inside updateUser
    return await updateUser(userName, { otp }) ? otp : null;
}

export async function clearOtp(userName) {
    return await updateUser(userName, { otp: '' });
}

export function getUserByEmail(email) {
    return getUsers().find(u => u.email && u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function isAuthRequired() {
    return getUsers().some(u => u.otp);
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

    // Async Push to Airtable
    pushTagToAirtable({ name: tag.name.trim(), color: tag.color || '#cbd5e0' })
        .catch(e => console.error('Failed to push tag to Airtable:', e));

    return true;
}

export function removeTag(name) {
    const lists = loadLists();
    const initLen = lists.tags.length;
    lists.tags = lists.tags.filter(t => t.name !== name);
    if (lists.tags.length !== initLen) {
        saveLists(lists);

        // Fetch ID then delete from Airtable
        fetchTagsFromAirtable().then(tags => {
            const match = tags.find(t => t.name === name);
            if (match) deleteTagFromAirtable(match.airtableId);
        }).catch(e => console.error('Failed to delete tag from Airtable:', e));

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

    // Fetch ID then update in Airtable
    // We use the NEW name for the update if renamed, but we need the OLD name to find the ID?
    // Actually, if we just renamed it locally, we can't find it by old name in a fresh fetch unless we fetch BEFORE.
    // SAFE APPROACH: fetch first, find by OLD name (since Airtable hasn't updated yet), then update.
    // But here we already updated local. `oldName` is passed in argument.
    fetchTagsFromAirtable().then(tags => {
        const match = tags.find(t => t.name === oldName);
        if (match) {
            updateTagInAirtable(match.airtableId, {
                name: updatedTag.name ? updatedTag.name.trim() : match.name,
                color: updatedTag.color || match.color
            });
        }
    }).catch(e => console.error('Failed to update tag in Airtable:', e));

    return true;
}
