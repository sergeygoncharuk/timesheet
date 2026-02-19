// Airtable API integration
// Airtable field mapping:
//   Airtable "Date"        <-> app "date"
//   Airtable "Start"       <-> app "start"
//   Airtable "End"         <-> app "end"
//   Airtable "Vessel"      <-> app "vessel"
//   Airtable "Description" <-> app "activity"
//   Airtable "Type"        <-> app "tag"

// Keys are loaded from localStorage first, then environment variables as fallback.
// In Vercel, set env vars in Project Settings → Environment Variables.
const AIRTABLE_CONFIG_KEY = 'lte_airtable_config';

function loadAirtableConfig() {
    try {
        const saved = localStorage.getItem(AIRTABLE_CONFIG_KEY);
        if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return {};
}

function getConfig() {
    const saved = loadAirtableConfig();
    return {
        apiKey:          saved.apiKey          || import.meta.env.VITE_AIRTABLE_API_KEY          || '',
        baseId:          saved.baseId          || import.meta.env.VITE_AIRTABLE_BASE_ID          || '',
        tableId:         saved.tableId         || import.meta.env.VITE_AIRTABLE_TABLE_ID         || '',
        usersTableId:    saved.usersTableId    || import.meta.env.VITE_AIRTABLE_USERS_TABLE_ID   || '',
        vesselsTableId:  saved.vesselsTableId  || import.meta.env.VITE_AIRTABLE_VESSELS_TABLE_ID || '',
        tagsTableId:     saved.tagsTableId     || import.meta.env.VITE_AIRTABLE_TAGS_TABLE_ID    || '',
    };
}

export function getAirtableConfig() {
    return getConfig();
}

export function saveAirtableConfig(config) {
    localStorage.setItem(AIRTABLE_CONFIG_KEY, JSON.stringify(config));
}

function getApiUrl() {
    const c = getConfig();
    return `https://api.airtable.com/v0/${c.baseId}/${c.tableId}`;
}

function getHeaders() {
    const c = getConfig();
    return {
        'Authorization': `Bearer ${c.apiKey}`,
        'Content-Type': 'application/json'
    };
}

// Convert app entry -> Airtable fields
function toAirtableFields(entry) {
    return {
        Vessel: entry.vessel || '',
        Date: entry.date || '',
        Start: entry.start || '',
        End: entry.end || '',
        Description: entry.activity || '',
        Type: entry.tag || ''
    };
}

// Convert Airtable record -> app entry
function fromAirtableRecord(record) {
    // Airtable Date field returns ISO format YYYY-MM-DD
    const rawDate = record.fields.Date || '';

    return {
        id: record.id,
        airtableId: record.id,
        vessel: record.fields.Vessel || '',
        date: rawDate,
        start: record.fields.Start || '',
        end: record.fields.End || '',
        activity: record.fields.Description || '',
        tag: record.fields.Type || ''
    };
}

// Fetch all records (handles pagination)
export async function fetchAllRecords() {
    let allRecords = [];
    let offset = null;

    do {
        const url = offset ? `${getApiUrl()}?offset=${offset}` : getApiUrl();
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) {
            const err = await res.json();
            console.error('Airtable fetch error:', err);
            throw new Error(err.error?.message || 'Failed to fetch from Airtable');
        }
        const data = await res.json();
        allRecords = allRecords.concat(data.records.map(fromAirtableRecord));
        offset = data.offset || null;
    } while (offset);

    return allRecords;
}

// Fetch records for a specific vessel, filter date client-side
// (Airtable Date type filtering via formula is unreliable)
export async function fetchRecordsForVesselDate(vessel, dateStr) {
    const filterFormula = `{Vessel}="${vessel}"`;
    let allRecords = [];
    let offset = null;

    do {
        let url = `${getApiUrl()}?filterByFormula=${encodeURIComponent(filterFormula)}`;
        if (offset) url += `&offset=${offset}`;
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) {
            const err = await res.json();
            console.error('Airtable fetch error:', err);
            throw new Error(err.error?.message || 'Failed to fetch from Airtable');
        }
        const data = await res.json();
        allRecords = allRecords.concat(data.records.map(fromAirtableRecord));
        offset = data.offset || null;
    } while (offset);

    // Client-side date filter
    return allRecords.filter(r => r.date === dateStr);
}

// Create a new record
export async function createRecord(entry) {
    const res = await fetch(getApiUrl(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ fields: toAirtableFields(entry), typecast: true })
    });
    if (!res.ok) {
        const err = await res.json();
        console.error('Airtable create error:', err);
        throw new Error(err.error?.message || 'Failed to create in Airtable');
    }
    const data = await res.json();
    return fromAirtableRecord(data);
}

// Update an existing record
export async function updateRecord(recordId, updates) {
    const res = await fetch(`${getApiUrl()}/${recordId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ fields: toAirtableFields(updates), typecast: true })
    });
    if (!res.ok) {
        const err = await res.json();
        console.error('Airtable update error:', err);
        throw new Error(err.error?.message || 'Failed to update in Airtable');
    }
    const data = await res.json();
    return fromAirtableRecord(data);
}

// Delete a record
export async function deleteRecord(recordId) {
    const res = await fetch(`${getApiUrl()}/${recordId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!res.ok) {
        const err = await res.json();
        console.error('Airtable delete error:', err);
        throw new Error(err.error?.message || 'Failed to delete from Airtable');
    }
    return true;
}

// --- Users Table ---

function getUsersTableUrl() {
    const c = getConfig();
    if (!c.usersTableId) throw new Error('Users Table ID is not configured');
    return `https://api.airtable.com/v0/${c.baseId}/${c.usersTableId}`;
}

// Fetch all users from the Airtable Users table
export async function fetchUsersFromAirtable() {
    let allRecords = [];
    let offset = null;

    do {
        const url = offset ? `${getUsersTableUrl()}?offset=${offset}` : getUsersTableUrl();
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error?.message || 'Failed to fetch users from Airtable');
        }
        const data = await res.json();
        allRecords = allRecords.concat(data.records.map(r => ({
            airtableId: r.id,
            name: r.fields.Name || '',
            email: r.fields.Email || '',
            role: r.fields.Role || 'Vessel',
            sortId: r.fields.ID || 0
        })));
        offset = data.offset || null;
    } while (offset);

    return allRecords;
}

// Push a user to the Airtable Users table
export async function pushUserToAirtable(user) {
    const res = await fetch(getUsersTableUrl(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            fields: { Name: user.name, Email: user.email || '', Role: user.role || 'Vessel' },
            typecast: true
        })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to push user to Airtable');
    }
    return await res.json();
}

export async function updateUserInAirtable(recordId, updates) {
    const fields = {};
    if (updates.name !== undefined) fields.Name = updates.name;
    if (updates.email !== undefined) fields.Email = updates.email;
    if (updates.role !== undefined) fields.Role = updates.role;
    const res = await fetch(`${getUsersTableUrl()}/${recordId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ fields, typecast: true })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to update user in Airtable');
    }
    return await res.json();
}

export async function deleteUserFromAirtable(recordId) {
    const res = await fetch(`${getUsersTableUrl()}/${recordId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to delete user from Airtable');
    }
    return true;
}

// --- Vessels Table ---

function getVesselsTableUrl() {
    const c = getConfig();
    if (!c.vesselsTableId) throw new Error('Vessels Table ID is not configured');
    return `https://api.airtable.com/v0/${c.baseId}/${c.vesselsTableId}`;
}

export async function fetchVesselsFromAirtable() {
    let allRecords = [];
    let offset = null;

    do {
        const url = offset ? `${getVesselsTableUrl()}?offset=${offset}` : getVesselsTableUrl();
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error?.message || 'Failed to fetch vessels from Airtable');
        }
        const data = await res.json();
        allRecords = allRecords.concat(data.records.map(r => ({
            airtableId: r.id,
            name: r.fields.Name || ''
        })));
        offset = data.offset || null;
    } while (offset);

    return allRecords;
}

export async function pushVesselToAirtable(vesselName) {
    const res = await fetch(getVesselsTableUrl(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            fields: { Name: vesselName },
            typecast: true
        })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to push vessel to Airtable');
    }
    return await res.json();
}

export async function updateVesselInAirtable(recordId, vesselName) {
    const res = await fetch(`${getVesselsTableUrl()}/${recordId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
            fields: { Name: vesselName },
            typecast: true
        })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to update vessel in Airtable');
    }
    return await res.json();
}

export async function deleteVesselFromAirtable(recordId) {
    const res = await fetch(`${getVesselsTableUrl()}/${recordId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to delete vessel from Airtable');
    }
    return true;
}

// --- Tags Table ---

function getTagsTableUrl() {
    const c = getConfig();
    if (!c.tagsTableId) throw new Error('Tags Table ID is not configured');
    return `https://api.airtable.com/v0/${c.baseId}/${c.tagsTableId}`;
}

export async function fetchTagsFromAirtable() {
    let allRecords = [];
    let offset = null;

    do {
        const url = offset ? `${getTagsTableUrl()}?offset=${offset}` : getTagsTableUrl();
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error?.message || 'Failed to fetch tags from Airtable');
        }
        const data = await res.json();
        allRecords = allRecords.concat(data.records.map(r => ({
            airtableId: r.id,
            name: r.fields.Name || '',
            color: r.fields.Color || '#cbd5e0'
        })));
        offset = data.offset || null;
    } while (offset);

    return allRecords;
}

export async function pushTagToAirtable(tag) {
    const res = await fetch(getTagsTableUrl(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            fields: { Name: tag.name, Color: tag.color },
            typecast: true
        })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to push tag to Airtable');
    }
    return await res.json();
}

export async function updateTagInAirtable(recordId, tag) {
    const res = await fetch(`${getTagsTableUrl()}/${recordId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
            fields: { Name: tag.name, Color: tag.color },
            typecast: true
        })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to update tag in Airtable');
    }
    return await res.json();
}

export async function deleteTagFromAirtable(recordId) {
    const res = await fetch(`${getTagsTableUrl()}/${recordId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to delete tag from Airtable');
    }
    return true;
}
