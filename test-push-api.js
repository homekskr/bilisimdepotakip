// Test script to manually call Vercel push API
const axios = require('axios');

const API_URL = 'https://bilisimdepotakip-snowy.vercel.app/api/send-push';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXBwbXpqZWFpeHN6Z3dlYnpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjUxODExNCwiZXhwIjoyMDgyMDk0MTE0fQ.JYUdzOxNX1p6lR5OYEVHZC9IJGmYWUfBvsIFLfC9GbM';

async function testPushAPI() {
    try {
        const response = await axios.post(API_URL, {
            user_id: 'f1a87ceb-49a6-490d-8990-ce7db620efdd',
            title: 'Test Push',
            message: 'Bu bir test bildirimidir',
            link: '#requests'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_KEY}`
            }
        });

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testPushAPI();
