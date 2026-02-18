// Airtable API integration
// Airtable field mapping:
//   Airtable "Date"        <-> app "date"
//   Airtable "From"        <-> app "start"
//   Airtable "To"          <-> app "end"
//   Airtable "Vessel"      <-> app "vessel"
//   Airtable "Description" <-> app "activity"
//   Airtable "Tag"         <-> app "tag"

// Keys are loaded from environment variables (see .env file)
// In Vercel, set these in Project Settings → Environment Variables
const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY || '';
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID || '';
const AIRTABLE_TABLE_ID = import.meta.env.VITE_AIRTABLE_TABLE_ID || '';
const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;

const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
};

// Convert app entry -> Airtable fields
function toAirtableFields(entry) {
    return {
        Vessel: entry.vessel || '',
        Date: entry.date || '',
        From: entry.start || '',
        To: entry.end || '',
        Description: entry.activity || '',
        Tag: entry.tag || ''
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
        start: record.fields.From || '',
        end: record.fields.To || '',
        activity: record.fields.Description || '',
        tag: record.fields.Tag || ''
    };
}

// Fetch all records (handles pagination)
export async function fetchAllRecords() {
    let allRecords = [];
    let offset = null;

    do {
        const url = offset ? `${API_URL}?offset=${offset}` : API_URL;
        const res = await fetch(url, { headers });
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
        let url = `${API_URL}?filterByFormula=${encodeURIComponent(filterFormula)}`;
        if (offset) url += `&offset=${offset}`;
        const res = await fetch(url, { headers });
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
    const res = await fetch(API_URL, {
        method: 'POST',
        headers,
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
    const res = await fetch(`${API_URL}/${recordId}`, {
        method: 'PATCH',
        headers,
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
    const res = await fetch(`${API_URL}/${recordId}`, {
        method: 'DELETE',
        headers
    });
    if (!res.ok) {
        const err = await res.json();
        console.error('Airtable delete error:', err);
        throw new Error(err.error?.message || 'Failed to delete from Airtable');
    }
    return true;
}
