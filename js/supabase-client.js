// Supabase Client Initialization
import { createClient } from '@supabase/supabase-js';

// Supabase configuration - TEMPORARY HARDCODED (move to .env later)
const supabaseUrl = 'https://zhsiursfqooolkkbwvwb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpoc2l1cnNmcW9vb2xra2J3dndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTg0MzAsImV4cCI6MjA4MTU3NDQzMH0.KqU6r08mKayCQbX-KdFVBr4L3bmhRFRS1BodUQFOiZI';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials are missing!');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Data Cache with persistence
const cache = {
    materials: JSON.parse(localStorage.getItem('cache_materials')) || null,
    assignments: JSON.parse(localStorage.getItem('cache_assignments')) || null,
    requests: JSON.parse(localStorage.getItem('cache_requests')) || null,
    profiles: {}, // Cache by userId
    lastFetch: {}
};

// Expose cache to window for instant access
window.materialsData = cache.materials;
window.assignmentsData = cache.assignments;
window.requestsData = cache.requests;

export const clearCache = (key = null) => {
    if (key) {
        cache[key] = null;
        localStorage.removeItem(`cache_${key}`);
        window[`${key}Data`] = null;
    } else {
        ['materials', 'assignments', 'requests'].forEach(k => {
            cache[k] = null;
            localStorage.removeItem(`cache_${k}`);
            window[`${k}Data`] = null;
        });
    }
};

// Helper to update persistent cache
export const updateCache = (key, data) => {
    cache[key] = data;
    localStorage.setItem(`cache_${key}`, JSON.stringify(data));
    window[`${key}Data`] = data;
};

// Helper function to get current user
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('Error getting user:', error);
        return null;
    }
    return user;
}

// Helper function to get user profile with timeout and cache
export async function getUserProfile(userId) {
    // 1. Check memory cache
    if (cache.profiles[userId]) return cache.profiles[userId];

    // 2. Check localStorage cache
    const cached = localStorage.getItem(`profile_${userId}`);
    if (cached) {
        try {
            const data = JSON.parse(cached);
            cache.profiles[userId] = data;
            return data;
        } catch (e) {
            console.error('Cache parse error:', e);
        }
    }

    console.log('Fetching profile for:', userId);
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error getting profile:', error);
        return null;
    }

    cache.profiles[userId] = data;
    localStorage.setItem(`profile_${userId}`, JSON.stringify(data));
    return data;
}

// Helper function to check user role
export async function checkUserRole(requiredRoles) {
    // 1. Check cached profile first
    if (window.currentProfile) {
        const role = window.currentProfile.role;
        return Array.isArray(requiredRoles) ? requiredRoles.includes(role) : role === requiredRoles;
    }

    // 2. If no profile, try to get session and fetch (fallback)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const profile = await getUserProfile(session.user.id);
    if (!profile) return false;

    const role = profile.role;
    return Array.isArray(requiredRoles) ? requiredRoles.includes(role) : role === requiredRoles;
}

// Export for global access
window.supabase = supabase;
window.getUserProfile = getUserProfile;
window.checkUserRole = checkUserRole;
window.clearCache = clearCache;
