export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, otp } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const AIRTABLE_API_KEY = process.env.VITE_AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.VITE_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
    const USERS_TABLE_ID = process.env.VITE_AIRTABLE_USERS_TABLE_ID || process.env.AIRTABLE_USERS_TABLE_ID;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !USERS_TABLE_ID) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        // 1. Find User by Email AND OTP
        // We filter where Email matches AND OTP matches.
        const filterByFormula = `AND({Email}="${email}", {OTP}="${otp}")`;
        const findUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE_ID}?filterByFormula=${encodeURIComponent(filterByFormula)}`;

        const findRes = await fetch(findUrl, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!findRes.ok) {
            throw new Error('Failed to query Airtable');
        }

        const data = await findRes.json();
        if (!data.records || data.records.length === 0) {
            return res.status(401).json({ error: 'Invalid OTP or User' });
        }

        const userRecord = data.records[0];

        // 2. Clear OTP (single use)
        // We do this asynchronously, don't necessarily need to block response if speed is key, but safer to block.
        const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE_ID}/${userRecord.id}`;
        await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: { OTP: '' }
            })
        }); // Fire and forget catch? No, let's await to be clean.

        // 3. Return User Data for Session
        const user = {
            id: userRecord.id,
            name: userRecord.fields.Name,
            email: userRecord.fields.Email,
            role: userRecord.fields.Role || 'Vessel',
            sortId: userRecord.fields.ID
        };

        return res.status(200).json({ success: true, user });

    } catch (e) {
        console.error('Verify OTP Error:', e);
        return res.status(500).json({ error: e.message });
    }
}
