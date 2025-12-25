// Main App Module - Routing and Page Management
import { supabase, updateCache } from './supabase-client.js';
import { showConfirm } from './ui.js';

// Current page state
let currentPage = '';

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const pageContent = document.getElementById('page-content');
const menuToggle = document.getElementById('menu-toggle');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// Sidebar Toggle Logic
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
    sidebarOverlay?.classList.toggle('active');
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.remove('open');
    sidebarOverlay?.classList.remove('active');
}

// Initial Setup
if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

// Initialize routing
let isRoutesInitialized = false;
function initRouting() {
    if (isRoutesInitialized) return;
    isRoutesInitialized = true;

    console.log('Initializing routing...');

    // Check PWA status
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    // Handle nav clicks
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });

    // Handle browser back and Exit Trap
    window.addEventListener('popstate', async (e) => {
        // PWA Trap Logic
        if (currentPage === 'dashboard' && isPWA) {
            // Check if we popped to the root state (trap triggered)
            const isRoot = !e.state || e.state.root === true;

            if (isRoot) {
                // We are at the 'root' attempt to exit
                const intentToExit = await showConfirm(
                    'Uygulamadan Çıkılsın mı?',
                    'Bilişim Depo Takip uygulamasından çıkmak istediğinizden emin misiniz?',
                    'Evet, Kapat'
                );

                if (!intentToExit) {
                    // User stayed: Restore trap
                    window.history.pushState({ page: 'dashboard', trap: true }, '', '#dashboard');
                    return;
                } else {
                    // User wants to exit. 
                    window.history.back();
                    return;
                }
            }
        }

        if (e.state && e.state.page) {
            loadPage(e.state.page, false);
        }
    });

    // Load initial page
    let hash = window.location.hash.slice(1);
    if (!hash) hash = 'dashboard';

    // Initial Setup
    // PWA Trap: Set IMMEDIATELLY before loading data
    if (hash === 'dashboard' && isPWA) {
        // Ensure we have a history stack to pop from
        // 1. Replace current root with clean state
        window.history.replaceState({ page: 'dashboard', root: true }, '', '#dashboard');
        // 2. Push the "Trap" state. User is now at index 1. Back button goes to index 0 (Root).
        window.history.pushState({ page: 'dashboard', trap: true }, '', '#dashboard');
    }

    loadPage(hash);

    // Only update visual nav if not done by loadPage
    updateNav(hash);
}

// Helper to update visual nav state
function updateNav(page) {
    navItems.forEach(item => {
        if (item.dataset.page === page) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Navigate to page
function navigateTo(page, pushState = true) {
    if (page === currentPage) return;
    currentPage = page;
    updateNav(page);

    // PWA Special: If going TO dashboard, ensure trap is set
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (pushState) {
        window.history.pushState({ page }, '', `#${page}`);

        if (page === 'dashboard' && isPWA) {
            // We generally trust the initial trap, but sticking to simple nav for now.
        }
    }

    loadPage(page);
    closeSidebar();
}

// Load page content
async function loadPage(page) {
    // Show spinner ONLY if data is missing for that page
    const hasCache = (page === 'materials' && window.materialsData) ||
        (page === 'assignments' && window.assignmentsData) ||
        (page === 'requests' && window.requestsData) ||
        (page === 'users' && window.usersData);

    // Role-based routing protection
    const role = window.currentProfile ? window.currentProfile.role : null;

    // 1. Personel can ONLY see requests
    if (role === 'personel' && page !== 'requests') {
        console.warn('Personel restricted page access attempt:', page);
        navigateTo('requests');
        return;
    }

    // 2. ONLY admin can see users page
    if (page === 'users' && role !== 'admin') {
        console.warn('Non-admin access attempt to users page:', role);
        navigateTo('dashboard');
        return;
    }

    if (!hasCache && page !== 'reports') {
        pageContent.innerHTML = '<div class="loading">Veriler hazırlanıyor...</div>';
    }

    try {
        switch (page) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'materials':
                await loadMaterials();
                break;
            case 'assignments':
                await loadAssignments();
                break;
            case 'requests':
                await loadRequests();
                break;
            case 'users':
                await loadUsers();
                break;
            case 'reports':
                await loadReports();
                break;
            default:
                pageContent.innerHTML = '<div class="error">Sayfa bulunamadı</div>';
        }
    } catch (error) {
        console.error('Error loading page:', error);
        pageContent.innerHTML = `<div class="error">Sayfa yüklenirken hata oluştu: ${error.message}</div>`;
    }
}

// Dashboard State
let dashboardState = {
    typeFilter: 'all',
    conditionFilter: 'all',
    sortBy: 'quantity-desc'
};

function renderSummaryTable() {
    const materials = window.materialsData || [];

    // Group and aggregate
    const stockSummary = {};
    materials.forEach(m => {
        // Apply filters
        if (dashboardState.typeFilter !== 'all' && m.type !== dashboardState.typeFilter) return;
        if (dashboardState.conditionFilter !== 'all' && m.condition !== dashboardState.conditionFilter) return;

        const key = `${m.type}|${m.condition}`;
        if (!stockSummary[key]) {
            stockSummary[key] = { type: m.type, condition: m.condition, quantity: 0 };
        }
        stockSummary[key].quantity += (m.quantity || 0);
    });

    let summaryList = Object.values(stockSummary);

    // Apply sorting
    summaryList.sort((a, b) => {
        if (dashboardState.sortBy === 'quantity-desc') return b.quantity - a.quantity;
        if (dashboardState.sortBy === 'quantity-asc') return a.quantity - b.quantity;
        if (dashboardState.sortBy === 'type-asc') return a.type.localeCompare(b.type, 'tr');
        if (dashboardState.sortBy === 'condition-asc') return a.condition.localeCompare(b.condition, 'tr');
        return 0;
    });

    const tbody = document.getElementById('summary-table-body');
    if (!tbody) return;

    tbody.innerHTML = summaryList.map(s => `
        <tr>
            <td data-label="MALZEME TÜRÜ">${s.type}</td>
            <td data-label="MALZEME DURUMU"><span class="badge ${s.condition === 'YENİ' ? 'badge-success' : 'badge-warning'}">${s.condition}</span></td>
            <td data-label="STOK ADEDİ"><span class="badge badge-info">${s.quantity}</span></td>
        </tr>
    `).join('') || '<tr><td colspan="3">Veri bulunamadı</td></tr>';
}

// Dashboard Page
async function loadDashboard() {
    console.log('Loading Dashboard data...');

    // Paralel pre-fetch
    const tasks = [];
    if (!window.materialsData) {
        tasks.push(supabase.from('materials').select('*').then(({ data }) => updateCache('materials', data || [])));
    }
    if (!window.assignmentsData) {
        tasks.push(supabase.from('assignments').select('*').eq('status', 'aktif').then(({ data }) => updateCache('assignments', data || [])));
    }
    if (!window.requestsData) {
        tasks.push(supabase.from('requests').select('*').in('status', ['beklemede', 'yonetici_onayi', 'baskan_onayi']).then(({ data }) => updateCache('requests', data || [])));
    }

    if (tasks.length > 0) {
        await Promise.all(tasks);
    }

    const materials = window.materialsData || [];
    const assignments = window.assignmentsData || [];
    const requests = window.requestsData || [];

    const totalMaterials = materials.length;
    const totalQuantity = materials.reduce((sum, m) => sum + m.quantity, 0) || 0;
    const activeAssignments = assignments.filter(a => a.status === 'aktif').length;
    const pendingRequests = requests.filter(r => ['beklemede', 'yonetici_onayi', 'baskan_onayi'].includes(r.status)).length;

    // Calculate stock summary by type and condition
    const stockSummary = {};
    materials.forEach(m => {
        const key = `${m.type}|${m.condition}`;
        if (!stockSummary[key]) {
            stockSummary[key] = { type: m.type, condition: m.condition, quantity: 0 };
        }
        stockSummary[key].quantity += (m.quantity || 0);
    });
    const summaryList = Object.values(stockSummary).sort((a, b) => b.quantity - a.quantity);

    // Get unique types and conditions for filters
    const allTypes = [...new Set(materials.map(m => m.type))].sort();
    const allConditions = [...new Set(materials.map(m => m.condition))].sort();

    pageContent.innerHTML = `
        <div class="page-header">
            <h1>Ana Ekran</h1>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M4 10H20" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <div class="stat-label">Toplam Malzeme Türü</div>
                <div class="stat-value">${totalMaterials}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M20 7H4M20 7L16 3M20 7L16 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M4 17H20M4 17L8 13M4 17L8 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="stat-label">Toplam Adet</div>
                <div class="stat-value">${totalQuantity}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 4V20M12 20L8 16M12 20L16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="stat-label">Aktif Zimmetler</div>
                <div class="stat-value">${activeAssignments}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 7V13L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="stat-label">Bekleyen Talepler</div>
                <div class="stat-value">${pendingRequests}</div>
            </div>
        </div>

        <div class="card" style="margin-bottom: 2rem;">
            <div class="card-header">
                <h2 class="card-title">Stok Özet Tablosu (Tür ve Durum Bazlı)</h2>
                <div class="table-filters" style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
                    <select id="dash-filter-type" class="btn btn-sm btn-secondary" style="background: var(--bg-secondary); text-align: left;">
                        <option value="all">Tüm Türler</option>
                        ${allTypes.map(t => `<option value="${t}" ${dashboardState.typeFilter === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                    <select id="dash-filter-condition" class="btn btn-sm btn-secondary" style="background: var(--bg-secondary); text-align: left;">
                        <option value="all">Tüm Durumlar</option>
                        ${allConditions.map(c => `<option value="${c}" ${dashboardState.conditionFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                    <select id="dash-sort" class="btn btn-sm btn-secondary" style="background: var(--bg-secondary); text-align: left;">
                        <option value="quantity-desc" ${dashboardState.sortBy === 'quantity-desc' ? 'selected' : ''}>En Çok Stok</option>
                        <option value="quantity-asc" ${dashboardState.sortBy === 'quantity-asc' ? 'selected' : ''}>En Az Stok</option>
                        <option value="type-asc" ${dashboardState.sortBy === 'type-asc' ? 'selected' : ''}>Türe Göre (A-Z)</option>
                        <option value="condition-asc" ${dashboardState.sortBy === 'condition-asc' ? 'selected' : ''}>Duruma Göre (A-Z)</option>
                    </select>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>MALZEME TÜRÜ</th>
                            <th>MALZEME DURUMU</th>
                            <th>STOK ADEDİ</th>
                        </tr>
                    </thead>
                    <tbody id="summary-table-body">
                        <!-- Will be populated by renderSummaryTable -->
                    </tbody>
                </table>
            </div>
        </div>

    `;

    // Populate table initially
    renderSummaryTable();

    // Attach event listeners
    document.getElementById('dash-filter-type')?.addEventListener('change', (e) => {
        dashboardState.typeFilter = e.target.value;
        renderSummaryTable();
    });
    document.getElementById('dash-filter-condition')?.addEventListener('change', (e) => {
        dashboardState.conditionFilter = e.target.value;
        renderSummaryTable();
    });
    document.getElementById('dash-sort')?.addEventListener('change', (e) => {
        dashboardState.sortBy = e.target.value;
        renderSummaryTable();
    });
}

// Materials Page - Will be implemented in materials.js
async function loadMaterials() {
    if (window.materialsModule && window.materialsModule.render) {
        await window.materialsModule.render();
    } else {
        pageContent.innerHTML = '<div class="error">Malzemeler modülü yükleniyor...</div>';
    }
}

// Assignments Page - Will be implemented in assignments.js
async function loadAssignments() {
    if (window.assignmentsModule && window.assignmentsModule.render) {
        await window.assignmentsModule.render();
    } else {
        pageContent.innerHTML = '<div class="error">Zimmetler modülü yükleniyor...</div>';
    }
}

// Requests Page - Will be implemented in requests.js
async function loadRequests() {
    if (window.requestsModule && window.requestsModule.render) {
        await window.requestsModule.render();
    } else {
        pageContent.innerHTML = '<div class="error">Talepler modülü yükleniyor...</div>';
    }
}

// Users Page - Will be implemented in users.js
async function loadUsers() {
    if (window.usersModule && window.usersModule.render) {
        await window.usersModule.render();
    } else {
        pageContent.innerHTML = '<div class="error">Kullanıcılar modülü yükleniyor...</div>';
    }
}

// Reports Page - Will be implemented in reports.js
async function loadReports() {
    if (window.reportsModule && window.reportsModule.render) {
        await window.reportsModule.render();
    } else {
        pageContent.innerHTML = '<div class="error">Raporlar modülü yükleniyor...</div>';
    }
}

// Wait for user login before initializing
window.addEventListener('userLoggedIn', () => {
    initRouting();
});

// Finalize app module and export reset function
function resetApp() {
    console.log('Resetting app state...');
    currentPage = '';
    isRoutesInitialized = false;
    if (pageContent) pageContent.innerHTML = '';

    // Reset nav visual state
    navItems.forEach(item => item.classList.remove('active'));
}

// Export navigation and reset functions
window.navigateTo = navigateTo;
window.resetApp = resetApp;

export { navigateTo, loadDashboard, resetApp };
