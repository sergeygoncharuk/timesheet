import { Resend } from 'resend';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const AIRTABLE_API_KEY = process.env.VITE_AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.VITE_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
    const USERS_TABLE_ID = process.env.VITE_AIRTABLE_USERS_TABLE_ID || process.env.AIRTABLE_USERS_TABLE_ID;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !USERS_TABLE_ID || !RESEND_API_KEY) {
        return res.status(500).json({ error: 'Server configuration error (missing env vars)' });
    }

    try {
        // 1. Find User in Airtable
        const filterByFormula = `{Email}="${email}"`;
        const findUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE_ID}?filterByFormula=${encodeURIComponent(filterByFormula)}`;

        const findRes = await fetch(findUrl, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!findRes.ok) {
            const findErr = await findRes.json().catch(() => ({}));
            console.error('Airtable find user error:', findRes.status, JSON.stringify(findErr));
            throw new Error(findErr?.error?.message || `Failed to query Airtable (${findRes.status})`);
        }

        const data = await findRes.json();
        if (!data.records || data.records.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userRecord = data.records[0];
        const userId = userRecord.id;
        const userName = userRecord.fields.Name;

        // 2. Generate OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));

        // 3. Update Airtable with OTP
        const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE_ID}/${userId}`;
        const updateRes = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: { OTP: otp },
                typecast: true
            })
        });

        if (!updateRes.ok) {
            const updateErr = await updateRes.json().catch(() => ({}));
            console.error('Airtable OTP update error:', updateRes.status, JSON.stringify(updateErr));
            throw new Error(updateErr?.error?.message || `Failed to save OTP to Airtable (${updateRes.status})`);
        }

        // 4. Send Email via Resend
        const resend = new Resend(RESEND_API_KEY);
        const { data: emailData, error } = await resend.emails.send({
            from: 'LTE Timesheet <onboarding@resend.dev>', // Update this if you have a custom domain
            to: [email],
            subject: 'Your Login Code',
            html: `<p>Hi ${userName},</p><p>Your login code for LTE Timesheet is: <strong>${otp}</strong></p><p>Passage is safe.</p>`
        });

        if (error) {
            console.error('Resend error:', error);
            throw new Error('Failed to send email');
        }

        return res.status(200).json({ success: true, message: 'OTP sent' });

    } catch (e) {
        console.error('Send OTP Error:', e);
        return res.status(500).json({ error: e.message });
    }
}
