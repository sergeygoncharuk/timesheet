import { Resend } from 'resend';
import crypto from 'crypto';

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
    const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const OTP_SECRET = process.env.OTP_SECRET;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !USERS_TABLE_ID || !RESEND_API_KEY || !OTP_SECRET) {
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
            return res.status(404).json({ error: 'This email is not registered. Please contact your administrator.' });
        }

        const userRecord = data.records[0];
        const userName = userRecord.fields.Name;

        // 2. Generate OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));

        // 3. Sign OTP as a token (no Airtable write needed)
        const payload = JSON.stringify({ email, otp, exp: Date.now() + 10 * 60 * 1000 });
        const sig = crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('hex');
        const token = Buffer.from(payload).toString('base64') + '.' + sig;

        // 4. Send Email via Resend
        const resend = new Resend(RESEND_API_KEY);
        const { error: emailError } = await resend.emails.send({
            from: `LTE Timesheet <${RESEND_FROM}>`,
            to: [email],
            subject: 'Your Login Code',
            html: `<p>Hi ${userName},</p><p>Your login code for LTE Timesheet is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`
        });

        if (emailError) {
            console.error('Resend error:', JSON.stringify(emailError));
            throw new Error(emailError.message || 'Failed to send email');
        }

        return res.status(200).json({ success: true, message: 'OTP sent', token });

    } catch (e) {
        console.error('Send OTP Error:', e);
        return res.status(500).json({ error: e.message });
    }
}
