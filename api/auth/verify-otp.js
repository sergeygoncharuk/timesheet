import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, otp, token } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const AIRTABLE_API_KEY = process.env.VITE_AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.VITE_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
    const USERS_TABLE_ID = process.env.VITE_AIRTABLE_USERS_TABLE_ID || process.env.AIRTABLE_USERS_TABLE_ID;
    const OTP_SECRET = process.env.OTP_SECRET;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !USERS_TABLE_ID) {
        console.error('Server Config Error: Missing Env Vars', {
            hasApiKey: !!AIRTABLE_API_KEY,
            hasBaseId: !!AIRTABLE_BASE_ID,
            hasTableId: !!USERS_TABLE_ID
        });
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        // Check for Master Password (bypasses token verification)
        const isMasterAuth = ADMIN_PASSWORD && otp === ADMIN_PASSWORD;

        if (!isMasterAuth) {
            // Verify HMAC token
            if (!token || !OTP_SECRET) {
                return res.status(401).json({ error: 'Invalid or missing token' });
            }

            const dotIndex = token.lastIndexOf('.');
            if (dotIndex === -1) {
                return res.status(401).json({ error: 'Invalid token format' });
            }

            const payloadB64 = token.slice(0, dotIndex);
            const sig = token.slice(dotIndex + 1);

            let payload;
            try {
                payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
            } catch {
                return res.status(401).json({ error: 'Invalid token' });
            }

            // Verify signature
            const expectedSig = crypto.createHmac('sha256', OTP_SECRET)
                .update(JSON.stringify(payload))
                .digest('hex');

            if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
                return res.status(401).json({ error: 'Invalid code' });
            }

            // Check expiry
            if (Date.now() > payload.exp) {
                return res.status(401).json({ error: 'Code has expired. Please request a new one.' });
            }

            // Check email and OTP match
            if (payload.email !== email || payload.otp !== otp) {
                return res.status(401).json({ error: 'Invalid code' });
            }
        }

        // Find user by email in Airtable
        const filterByFormula = `{Email}="${email}"`;
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
            return res.status(401).json({ error: 'User not found' });
        }

        const userRecord = data.records[0];

        // Return User Data for Session
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
