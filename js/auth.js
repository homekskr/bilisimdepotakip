// Authentication Module
import { supabase, getUserProfile, updateCache } from './supabase-client.js';
import { showToast, showConfirm } from './ui.js';
import { initNotifications, toggleNotificationPanel } from './notifications.js';

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
        const email = document.getElementById('login-email').value.trim().toLowerCase();
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

// Password Visibility Toggle
const togglePasswordBtn = document.getElementById('toggle-password');
const loginPasswordInput = document.getElementById('login-password');

if (togglePasswordBtn && loginPasswordInput) {
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = loginPasswordInput.type === 'password';
        loginPasswordInput.type = isPassword ? 'text' : 'password';

        // Update icon
        togglePasswordBtn.innerHTML = isPassword
            ? `<svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
               </svg>`
            : `<svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
               </svg>`;
    });
}

// Logout Handler
async function handleLogout(e) {
    if (e) e.preventDefault();
    console.log('Logout requested');

    const confirmed = await showConfirm(
        'Çıkış Yapılsın mı?',
        'Sistemden çıkış yapmak istediğinizden emin misiniz?',
        'Evet, Çıkış Yap'
    );

    if (confirmed) {
        try {
            console.log('Proceeding with signOut...');
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            console.log('SignOut successful');
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Çıkış yapılırken bir hata oluştu: ' + error.message, 'error');
        }
    }
}

// Attach logout to side-bar logout button
document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
// Notification Toggle
document.getElementById('notification-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNotificationPanel();
});

// Close notification panel when clicking outside
document.addEventListener('click', (e) => {
    const panel = document.getElementById('notification-panel');
    const btn = document.getElementById('notification-btn');
    if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.add('hidden');
    }
});

// Single initialization entry point
async function initializeAuth() {
    console.log('Initializing auth flow...');

    // 1. Check current session immediately
    try {
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
                initNotifications(); // Initialize notifications
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
                        initNotifications(); // Initialize notifications
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                window.currentUser = null;
                window.currentProfile = null;
                window.location.hash = ''; // Clear hash (e.g., #materials) on logout
                if (typeof window.resetApp === 'function') window.resetApp(); // Reset routing state
                showLogin();
            }
        });
    } catch (err) {
        console.error('Auth Initialization Error:', err);
        // Let global handler pick this up or show toast
        showToast('Başlatma hatası: ' + err.message, 'error');
        showLogin(); // Fallback
    }
}

// Run initialization
initializeAuth();

// Export functions
export { showLogin, showApp, getRoleDisplayName };
