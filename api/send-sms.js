import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Voice Telekom credentials from environment variables
const VOICE_TELEKOM_URL = 'http://smsvt.voicetelekom.com:9587/sms/create';
const VOICE_TELEKOM_USERNAME = process.env.VOICE_TELEKOM_USERNAME;
const VOICE_TELEKOM_PASSWORD = process.env.VOICE_TELEKOM_PASSWORD;
const VOICE_TELEKOM_SENDER = process.env.VOICE_TELEKOM_SENDER || 'KMARASISM';

// Create Basic Auth header
const authString = Buffer.from(`${VOICE_TELEKOM_USERNAME}:${VOICE_TELEKOM_PASSWORD}`).toString('base64');

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify request is from Supabase
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_KEY}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user_id, title, message } = req.body;

    if (!user_id || !title || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Create Supabase client
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        // Fetch user's phone number
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('phone, full_name')
            .eq('id', user_id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!profile || !profile.phone) {
            return res.status(200).json({ message: 'No phone number found', sent: 0 });
        }

        // Clean phone number (remove spaces, dashes, etc.)
        const cleanPhone = profile.phone.replace(/[^0-9]/g, '');

        // Ensure phone starts with 90 (Turkey country code)
        const phoneNumber = cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone}`;

        // Prepare SMS content
        const smsContent = `${title}: ${message}`;

        // Send SMS via Voice Telekom API (matching Postman format)
        const smsResponse = await axios.post(
            VOICE_TELEKOM_URL,
            {
                type: 1,
                sendingType: 0,
                title: `Bildirim ${Date.now()}`,
                content: smsContent,
                number: parseInt(phoneNumber),
                encoding: 1, // Turkish characters
                sender: VOICE_TELEKOM_SENDER,
                validity: 60
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${authString}`
                }
            }
        );

        console.log('SMS sent successfully:', smsResponse.data);

        return res.status(200).json({
            message: 'SMS sent successfully',
            sent: 1,
            phone: phoneNumber,
            response: smsResponse.data
        });

    } catch (error) {
        console.error('SMS send error:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Failed to send SMS',
            details: error.response ? error.response.data : error.message
        });
    }
}
