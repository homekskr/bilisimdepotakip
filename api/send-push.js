import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// VAPID keys will be set as Vercel environment variables
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@bilisimdepotakip.com'
};

webpush.setVapidDetails(
    vapidKeys.subject,
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify request is from Supabase (simple auth check)
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_KEY}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user_id, title, message, link } = req.body;

    if (!user_id || !title || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Create Supabase client
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        // Fetch user's push subscriptions
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', user_id);

        if (error) {
            console.error('Error fetching subscriptions:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!subscriptions || subscriptions.length === 0) {
            return res.status(200).json({ message: 'No subscriptions found', sent: 0 });
        }

        // Send push notification to each subscription
        const payload = JSON.stringify({
            title,
            body: message,
            url: link || '/',
            icon: '/icon-192.png',
            badge: '/icon-192.png'
        });

        const sendPromises = subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: sub.keys
                    },
                    payload
                );
                return { success: true, endpoint: sub.endpoint };
            } catch (error) {
                console.error('Push send error:', error);

                // If subscription is invalid (410 Gone), delete it
                if (error.statusCode === 410) {
                    await supabase
                        .from('push_subscriptions')
                        .delete()
                        .eq('id', sub.id);
                }

                return { success: false, endpoint: sub.endpoint, error: error.message };
            }
        });

        const results = await Promise.all(sendPromises);
        const successCount = results.filter(r => r.success).length;

        return res.status(200).json({
            message: 'Push notifications sent',
            sent: successCount,
            total: subscriptions.length,
            results
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
