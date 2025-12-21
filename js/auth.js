// Authentication Module
import { supabase, getUserProfile, updateCache } from './supabase-client.js';

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const app = document.getElementById('app');
const loadingScreen = document.getElementById('loading-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

let isInitialized = false;

// Show login screen
function showLogin() {
    isInitialized = true;
    loadingScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    app.classList.add('hidden');
    document.querySelector('.mobile-header')?.classList.add('hidden');
    console.log('Login screen shown');
}

// Show main app
function showApp(user, profile) {
    isInitialized = true;
    loadingScreen.classList.add('hidden');
    loginScreen.classList.add('hidden');
    app.classList.remove('hidden');
    document.querySelector('.mobile-header')?.classList.remove('hidden');

    // Update user info in sidebar
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    const userInitials = document.getElementById('user-initials');

    if (userName) userName.textContent = profile.full_name;
    if (userRole) userRole.textContent = getRoleDisplayName(profile.role);

    // Get initials
    if (userInitials && profile.full_name) {
        const names = profile.full_name.split(' ');
        const initials = names.map(n => n[0]).join('').substring(0, 2).toUpperCase();
        userInitials.textContent = initials;
    }

    // Role-based sidebar visibility
    const usersNavItem = document.getElementById('users-nav-item');
    const dashboardNavItem = document.getElementById('dashboard-nav-item');
    const materialsNavItem = document.getElementById('materials-nav-item');
    const assignmentsNavItem = document.getElementById('assignments-nav-item');
    const reportsNavItem = document.getElementById('reports-nav-item');
    const requestsNavItem = document.getElementById('requests-nav-item');

    if (profile.role === 'personel') {
        if (usersNavItem) usersNavItem.style.display = 'none';
        if (dashboardNavItem) dashboardNavItem.style.display = 'none';
        if (materialsNavItem) materialsNavItem.style.display = 'none';
        if (assignmentsNavItem) assignmentsNavItem.style.display = 'none';
        if (reportsNavItem) reportsNavItem.style.display = 'none';

        // Redirect to requests if on dashboard or no hash
        if (window.location.hash === '#dashboard' || !window.location.hash) {
            window.location.hash = '#requests';
        }
    } else {
        if (usersNavItem) usersNavItem.style.display = profile.role === 'admin' ? 'flex' : 'none';
        if (dashboardNavItem) dashboardNavItem.style.display = 'flex';
        if (materialsNavItem) materialsNavItem.style.display = 'flex';
        if (assignmentsNavItem) assignmentsNavItem.style.display = 'flex';
        if (reportsNavItem) reportsNavItem.style.display = 'flex';
    }

    // Store user data globally
    window.currentUser = user;
    window.currentProfile = profile;

    // Dispatch event for other modules
    window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user, profile } }));
}

// Get role display name
function getRoleDisplayName(role) {
    const roleNames = {
        'admin': 'Sistem Yöneticisi',
        'baskan': 'Başkan',
        'yonetici': 'Bilgi İşlem Yöneticisi',
        'depo': 'Depo Görevlisi',
        'personel': 'Personel'
    };
    return roleNames[role] || role;
}

// Login handler
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (loginError) loginError.classList.add('hidden');

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (error) {
            if (loginError) {
                loginError.textContent = error.message === 'Invalid login credentials' ? 'E-posta veya şifre hatalı.' : error.message;
                loginError.classList.remove('hidden');
            }
        }
    });
}

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm('SİSTEMDEN ÇIKIŞ YAPMAK İSTİYOR MUSUNUZ?')) {
            try {
                await supabase.auth.signOut();
            } catch (error) {
                console.error('Logout error:', error);
                alert('Çıkış yapılırken bir hata oluştu.');
            }
        }
    });
}

// Single initialization entry point
async function initializeAuth() {
    console.log('Initializing auth flow...');

    // 1. Check current session immediately
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Auth check error:', error);
        showLogin();
        return;
    }

    if (session && session.user) {
        console.log('Valid session found, fetching profile...');
        const profile = await getUserProfile(session.user.id);
        if (profile) {
            // Background pre-fetch dashboard data
            Promise.all([
                supabase.from('materials').select('*').then(({ data }) => updateCache('materials', data || [])),
                supabase.from('assignments').select('*').eq('status', 'aktif').then(({ data }) => updateCache('assignments', data || [])),
                supabase.from('requests').select('*').in('status', ['beklemede', 'yonetici_onayi', 'baskan_onayi']).then(({ data }) => updateCache('requests', data || []))
            ]).catch(err => console.error('Early pre-fetch error:', err));

            showApp(session.user, profile);
        } else {
            showLogin();
        }
    } else {
        console.log('No active session.');
        showLogin();
    }

    // 2. Setup listener for future changes (login/logout/token refresh)
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN' && session) {
            // Only fetch if profile missing or user changed
            if (!window.currentProfile || window.currentProfile.id !== session.user.id) {
                const profile = await getUserProfile(session.user.id);
                if (profile) {
                    // Background pre-fetch dashboard data
                    Promise.all([
                        supabase.from('materials').select('*').then(({ data }) => updateCache('materials', data || [])),
                        supabase.from('assignments').select('*').eq('status', 'aktif').then(({ data }) => updateCache('assignments', data || [])),
                        supabase.from('requests').select('*').in('status', ['beklemede', 'yonetici_onayi', 'baskan_onayi']).then(({ data }) => updateCache('requests', data || []))
                    ]).catch(err => console.error('Early pre-fetch error:', err));

                    showApp(session.user, profile);
                }
            }
        } else if (event === 'SIGNED_OUT') {
            window.currentUser = null;
            window.currentProfile = null;
            showLogin();
        }
    });
}

// Run initialization
initializeAuth();

// Export functions
export { showLogin, showApp, getRoleDisplayName };
