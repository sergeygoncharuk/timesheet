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
        console.error('Server Config Error: Missing Env Vars', {
            hasApiKey: !!AIRTABLE_API_KEY,
            hasBaseId: !!AIRTABLE_BASE_ID,
            hasTableId: !!USERS_TABLE_ID
        });
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
        let isMasterAuth = false;

        // Check for Master Password
        if (ADMIN_PASSWORD && otp === ADMIN_PASSWORD) {
            isMasterAuth = true;
        }

        // 1. Find User
        // If master auth, find by Email only. Otherwise, Email AND OTP.
        let filterByFormula;
        if (isMasterAuth) {
            filterByFormula = `{Email}="${email}"`;
        } else {
            filterByFormula = `AND({Email}="${email}", {OTP}="${otp}")`;
        }

        const findUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE_ID}?filterByFormula=${encodeURIComponent(filterByFormula)}`;

        const findRes = await fetch(findUrl, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!findRes.ok) {
            const errText = await findRes.text();
            console.error('Airtable Query Error:', findRes.status, errText);
            throw new Error(`Failed to query Airtable: ${findRes.status} ${findRes.statusText}`);
        }

        const data = await findRes.json();
        if (!data.records || data.records.length === 0) {
            return res.status(401).json({ error: 'Invalid User or OTP' });
        }

        const userRecord = data.records[0];

        // 2. Clear OTP (single use) - ONLY if not using master password
        if (!isMasterAuth && userRecord.fields.OTP) {
            const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE_ID}/${userRecord.id}`;
            const updateRes = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: { OTP: '' }
                })
            });

            if (!updateRes.ok) {
                const updateErrText = await updateRes.text();
                console.error('Airtable Update Error:', updateRes.status, updateErrText);
                // We don't fail the login here, but we log the error
            }
        }

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
        return res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
}
