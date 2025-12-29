import { supabase } from './supabase-client.js';
import { exportToPDF, exportToExcel } from './utils/export-logic.js';

const pageContent = document.getElementById('page-content');

let currentReportData = [];
let currentReportType = '';

// Render reports page
async function render() {
    pageContent.innerHTML = `
        <div class="page-header">
            <h1>Raporlar</h1>
        </div>
        
        <div class="stats-grid">
            <div class="card" style="cursor: pointer;" id="report-inventory">
                <h3>📦 Envanter Raporu</h3>
                <p>Tüm malzemelerin detaylı listesi</p>
                <button class="btn btn-primary btn-sm">Rapor Al</button>
            </div>
            
            <div class="card" style="cursor: pointer;" id="report-assignments">
                <h3>📋 Zimmet Raporu</h3>
                <p>Aktif ve geçmiş zimmet kayıtları</p>
                <button class="btn btn-primary btn-sm">Rapor Al</button>
            </div>
            
            <div class="card" style="cursor: pointer;" id="report-requests">
                <h3>📝 Talep Raporu</h3>
                <p>Talep durumları ve onay süreçleri</p>
                <button class="btn btn-primary btn-sm">Rapor Al</button>
            </div>
            
            <div class="card" style="cursor: pointer;" id="report-stock">
                <h3>📊 Tür Bazlı Stok</h3>
                <p>Malzeme türlerine göre genel özet</p>
                <button class="btn btn-primary btn-sm">Rapor Al</button>
            </div>

            <div class="card" style="cursor: pointer;" id="report-critical">
                <h3>⚠️ Kritik Stok</h3>
                <p>Miktarı azalan malzemeler (≤ 2 adet)</p>
                <button class="btn btn-danger btn-sm">Rapor Al</button>
            </div>

            <div class="card" style="cursor: pointer;" id="report-personnel">
                <h3>👥 Personel Özeti</h3>
                <p>Kişi bazlı aktif zimmet listesi</p>
                <button class="btn btn-secondary btn-sm">Rapor Al</button>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Rapor Önizleme</h2>
                <div class="search-container" id="report-search-container" style="display: none;">
                    <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" id="report-search-input" placeholder="Rapor içinde ara..." class="search-input">
                </div>
            </div>
            <div id="report-preview">
                <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                    Rapor görmek için yukarıdaki kartlardan birini seçin
                </p>
            </div>
        </div>
    `;

    // Event listeners
    document.getElementById('report-inventory')?.addEventListener('click', () => generateInventoryReport());
    document.getElementById('report-assignments')?.addEventListener('click', () => generateAssignmentsReport());
    document.getElementById('report-requests')?.addEventListener('click', () => generateRequestsReport());
    document.getElementById('report-stock')?.addEventListener('click', () => generateStockReport());
    document.getElementById('report-critical')?.addEventListener('click', () => generateCriticalStockReport());
    document.getElementById('report-personnel')?.addEventListener('click', () => generatePersonnelReport());

    document.getElementById('report-search-input')?.addEventListener('input', (e) => {
        filterReportData(e.target.value);
    });
}

// Generate Inventory Report
async function generateInventoryReport() {
    const preview = document.getElementById('report-preview');
    const searchContainer = document.getElementById('report-search-container');
    const searchInput = document.getElementById('report-search-input');

    preview.innerHTML = '<div class="loading">Rapor hazırlanıyor...</div>';

    const { data: materials } = await supabase
        .from('materials')
        .select('*')
        .order('type', { ascending: true });

    currentReportData = materials || [];
    currentReportType = 'inventory';
    searchContainer.style.display = 'block';
    searchInput.value = '';

    const totalItems = materials?.length || 0;
    const totalQuantity = materials?.reduce((sum, m) => sum + m.quantity, 0) || 0;

    preview.innerHTML = `
        <div class="page-header">
            <h2>Detaylı Envanter Listesi</h2>
            <div class="export-group">
                <button class="btn-export pdf" id="download-inventory-pdf" data-tooltip="PDF Raporu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </button>
                <button class="btn-export excel" id="download-inventory-excel" data-tooltip="Excel Raporu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                </button>
            </div>
        </div>
        <p><strong>Toplam Malzeme Türü:</strong> ${totalItems}</p>
        <p><strong>Toplam Adet:</strong> ${totalQuantity}</p>
        <br>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Durum</th>
                        <th>Tür</th>
                        <th>Malzeme Adı</th>
                        <th>Marka/Model</th>
                        <th>Adet</th>
                    </tr>
                </thead>
                <tbody id="report-table-body">
                    ${renderInventoryTableRows(materials)}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('download-inventory-pdf')?.addEventListener('click', () => {
        const columns = [
            { header: 'Durum', key: 'condition', style: 'width: 60px;' },
            { header: 'Tür', key: 'type', style: 'width: 120px;' },
            { header: 'Malzeme Adı', key: 'name' },
            { header: 'Marka/Model', key: 'brand_model' },
            { header: 'Adet', key: 'quantity', style: 'width: 40px; text-align: center;' }
        ];
        exportToPDF('Envanter Raporu', materials, columns);
    });

    document.getElementById('download-inventory-excel')?.addEventListener('click', () => {
        const columns = [
            { header: 'Durum', key: 'condition' },
            { header: 'Tür', key: 'type' },
            { header: 'Malzeme Adı', key: 'name' },
            { header: 'Marka/Model', key: 'brand_model' },
            { header: 'Adet', key: 'quantity' },
            { header: 'Barkod', key: 'barcode' },
            { header: 'Eklenme Tarihi', key: 'created_at', transform: val => new Date(val).toLocaleDateString('tr-TR') }
        ];
        exportToExcel('Envanter_Raporu', materials, columns);
    });
}

function renderInventoryTableRows(materials) {
    if (!materials || materials.length === 0) {
        return '<tr><td colspan="5">Veri yok</td></tr>';
    }
    return materials.map(m => `
            <td data-label="Durum">${m.condition}</td>
            <td data-label="Tür">${m.type}</td>
            <td data-label="Malzeme Adı">${m.name}</td>
            <td data-label="Marka/Model">${m.brand_model}</td>
            <td data-label="Adet">${m.quantity}</td>
        </tr>
    `).join('');
}

// Generate Assignments Report
async function generateAssignmentsReport() {
    const preview = document.getElementById('report-preview');
    const searchContainer = document.getElementById('report-search-container');
    const searchInput = document.getElementById('report-search-input');

    preview.innerHTML = '<div class="loading">Rapor hazırlanıyor...</div>';

    const { data: assignments } = await supabase
        .from('assignments')
        .select(`
            *,
            materials (name, type),
            profiles!assignments_assigned_by_fkey (full_name)
        `)
        .order('assigned_date', { ascending: false });

    currentReportData = assignments || [];
    currentReportType = 'assignments';
    searchContainer.style.display = 'block';
    searchInput.value = '';

    const activeCount = assignments?.filter(a => a.status === 'aktif').length || 0;
    const returnedCount = assignments?.filter(a => a.status === 'iade_edildi').length || 0;

    preview.innerHTML = `
        <div class="page-header">
            <h2>Giriş/Çıkış ve Zimmet Raporu</h2>
            <div class="export-group">
                <button class="btn-export pdf" id="download-assignments-pdf" data-tooltip="PDF Raporu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </button>
                <button class="btn-export excel" id="download-assignments-excel" data-tooltip="Excel Raporu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                </button>
            </div>
        </div>
        <p><strong>Aktif Zimmetler:</strong> ${activeCount}</p>
        <p><strong>İade Edilenler:</strong> ${returnedCount}</p>
        <br>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Malzeme</th>
                        <th>Marka/Model</th>
                        <th>Zimmetlenen</th>
                        <th>Unvan</th>
                        <th>Adet</th>
                        <th>Tarih</th>
                        <th>Durum</th>
                    </tr>
                </thead>
                <tbody id="report-table-body">
                    ${renderAssignmentsTableRows(assignments)}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('download-assignments-pdf')?.addEventListener('click', () => {
        const columns = [
            { header: 'Malzeme', key: 'materials.name' },
            { header: 'Marka/Model', key: 'materials.brand_model' },
            { header: 'Zimmetlenen', key: 'assigned_to' },
            { header: 'Unvan', key: 'target_title' },
            { header: 'Adet', key: 'quantity', style: 'width: 30px; text-align: center;' },
            { header: 'Tarih', key: 'assigned_date', style: 'width: 70px;', transform: val => new Date(val).toLocaleDateString('tr-TR') },
            { header: 'Durum', key: 'status', style: 'width: 60px;', transform: val => val === 'aktif' ? 'Aktif' : 'İade Edildi' }
        ];
        exportToPDF('Zimmet Raporu', assignments, columns);
    });

    document.getElementById('download-assignments-excel')?.addEventListener('click', () => {
        const columns = [
            { header: 'Malzeme', key: 'materials.name' },
            { header: 'Marka/Model', key: 'materials.brand_model' },
            { header: 'Zimmetlenen', key: 'assigned_to' },
            { header: 'Unvan', key: 'target_title' },
            { header: 'Adet', key: 'quantity' },
            { header: 'Tarih', key: 'assigned_date', transform: val => new Date(val).toLocaleDateString('tr-TR') },
            { header: 'Durum', key: 'status', transform: val => val === 'aktif' ? 'Aktif' : 'İade Edildi' },
            { header: 'Teslim Eden', key: 'profiles.full_name' }
        ];
        exportToExcel('Zimmet_Raporu', assignments, columns);
    });
}

function renderAssignmentsTableRows(assignments) {
    if (!assignments || assignments.length === 0) {
        return '<tr><td colspan="6">Veri yok</td></tr>';
    }
    return assignments.map(a => `
            <td data-label="Malzeme">${a.materials?.name || 'Bilinmiyor'}</td>
            <td data-label="Marka/Model">${a.materials?.brand_model || '-'}</td>
            <td data-label="Zimmetlene">${a.assigned_to}</td>
            <td data-label="Unvan">${a.target_title || '-'}</td>
            <td data-label="Adet">${a.quantity}</td>
            <td data-label="Tarih">${new Date(a.assigned_date).toLocaleDateString('tr-TR')}</td>
            <td data-label="Durum">${a.status === 'aktif' ? 'Aktif' : 'İade Edildi'}</td>
        </tr>
    `).join('');
}

// Generate Requests Report
async function generateRequestsReport() {
    const preview = document.getElementById('report-preview');
    const searchContainer = document.getElementById('report-search-container');
    const searchInput = document.getElementById('report-search-input');

    preview.innerHTML = '<div class="loading">Rapor hazırlanıyor...</div>';

    const { data: requests } = await supabase
        .from('requests')
        .select(`
            *,
            materials (name, type),
            profiles!requests_requested_by_fkey (full_name)
        `)
        .order('created_at', { ascending: false });

    currentReportData = requests || [];
    currentReportType = 'requests';
    searchContainer.style.display = 'block';
    searchInput.value = '';

    const pending = requests?.filter(r => r.status === 'beklemede').length || 0;
    const approved = requests?.filter(r => r.status === 'onaylandi').length || 0;
    const rejected = requests?.filter(r => r.status === 'reddedildi').length || 0;

    preview.innerHTML = `
        <div class="page-header">
            <h2>Talep ve Onay Geçmişi Raporu</h2>
            <div class="export-group">
                <button class="btn-export pdf" id="download-requests-pdf" data-tooltip="PDF Raporu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </button>
                <button class="btn-export excel" id="download-requests-excel" data-tooltip="Excel Raporu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                </button>
            </div>
        </div>
        <p><strong>Bekleyen:</strong> ${pending}</p>
        <p><strong>Onaylanan:</strong> ${approved}</p>
        <p><strong>Reddedilen:</strong> ${rejected}</p>
        <br>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Talep Eden</th>
                        <th>Malzeme</th>
                        <th>Adet</th>
                        <th>Durum</th>
                        <th>Talep Tarihi</th>
                    </tr>
                </thead>
                <tbody id="report-table-body">
                    ${renderRequestsTableRows(requests)}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('download-requests-pdf')?.addEventListener('click', () => {
        const columns = [
            { header: 'Talep Eden', key: 'profiles.full_name' },
            { header: 'Malzeme', key: 'materials.name' },
            { header: 'Adet', key: 'quantity', style: 'width: 40px; text-align: center;' },
            { header: 'Durum', key: 'status', style: 'width: 80px;', transform: val => val.toUpperCase() },
            { header: 'Tarih', key: 'created_at', style: 'width: 70px;', transform: val => new Date(val).toLocaleDateString('tr-TR') }
        ];
        exportToPDF('Talep Raporu', requests, columns);
    });

    document.getElementById('download-requests-excel')?.addEventListener('click', () => {
        const columns = [
            { header: 'Talep Eden', key: 'profiles.full_name' },
            { header: 'Malzeme Türü', key: 'requested_type' },
            { header: 'Atanan Malzeme', key: 'materials.name' },
            { header: 'Adet', key: 'quantity' },
            { header: 'Durum', key: 'status' },
            { header: 'Talep Tarihi', key: 'created_at', transform: val => new Date(val).toLocaleDateString('tr-TR') },
            { header: 'Neden', key: 'reason' }
        ];
        exportToExcel('Talep_Raporu', requests, columns);
    });
}

function renderRequestsTableRows(requests) {
    if (!requests || requests.length === 0) {
        return '<tr><td colspan="5">Veri yok</td></tr>';
    }
    return requests.map(r => `
            <td data-label="Talep Eden">${r.profiles?.full_name || 'Bilinmiyor'}</td>
            <td data-label="Malzeme">${r.materials?.name || 'Bilinmiyor'}</td>
            <td data-label="Adet">${r.quantity}</td>
            <td data-label="Durum">${r.status.toUpperCase()}</td>
            <td data-label="Talep Tarihi">${new Date(r.created_at).toLocaleDateString('tr-TR')}</td>
        </tr>
    `).join('');
}

// Generate Stock Report
async function generateStockReport() {
    const preview = document.getElementById('report-preview');
    const searchContainer = document.getElementById('report-search-container');
    const searchInput = document.getElementById('report-search-input');

    preview.innerHTML = '<div class="loading">Rapor hazırlanıyor...</div>';

    const { data: materials } = await supabase
        .from('materials')
        .select('*');

    // Group by type
    const byType = {};
    materials?.forEach(m => {
        if (!byType[m.type]) {
            byType[m.type] = { type: m.type, count: 0, quantity: 0 };
        }
        byType[m.type].count++;
        byType[m.type].quantity += m.quantity;
    });

    const stockData = Object.values(byType);
    currentReportData = stockData;
    currentReportType = 'stock';
    searchContainer.style.display = 'block';
    searchInput.value = '';

    preview.innerHTML = `
        <div class="page-header">
            <h2>Tür Bazlı Stok Özeti</h2>
            <div class="export-group">
                <button class="btn-export pdf" id="download-stock-pdf" data-tooltip="PDF Raporu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </button>
                <button class="btn-export excel" id="download-stock-excel" data-tooltip="Excel Raporu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                </button>
            </div>
        </div>
        <br>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Malzeme Türü</th>
                        <th>Çeşit Sayısı</th>
                        <th>Toplam Stok</th>
                    </tr>
                </thead>
                <tbody id="report-table-body">
                    ${renderStockTableRows(stockData)}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('download-stock-pdf')?.addEventListener('click', () => {
        const columns = [
            { header: 'Malzeme Türü', key: 'type' },
            { header: 'Çeşit Sayısı', key: 'count', style: 'width: 80px; text-align: center;' },
            { header: 'Toplam Stok', key: 'quantity', style: 'width: 80px; text-align: center;' }
        ];
        exportToPDF('Stok Durumu Raporu', stockData, columns);
    });

    document.getElementById('download-stock-excel')?.addEventListener('click', () => {
        const columns = [
            { header: 'Malzeme Türü', key: 'type' },
            { header: 'Çeşit Sayısı', key: 'count' },
            { header: 'Toplam Stok', key: 'quantity' }
        ];
        exportToExcel('Stok_Durumu_Raporu', stockData, columns);
    });
}

function renderStockTableRows(stockData) {
    if (!stockData || stockData.length === 0) {
        return '<tr><td colspan="3">Veri yok</td></tr>';
    }
    return stockData.map(data => `
        <tr>
            <td data-label="Malzeme Türü">${data.type}</td>
            <td data-label="Çeşit Sayısı">${data.count}</td>
            <td data-label="Toplam Adet">${data.quantity}</td>
        </tr>
    `).join('');
}

// Filter report data
function filterReportData(query) {
    if (!currentReportData || currentReportData.length === 0) return;

    const q = query.toLowerCase();
    const tbody = document.getElementById('report-table-body');
    if (!tbody) return;

    let filtered = [];
    switch (currentReportType) {
        case 'inventory':
            filtered = currentReportData.filter(m =>
                m.name.toLowerCase().includes(q) ||
                m.type.toLowerCase().includes(q) ||
                m.brand_model.toLowerCase().includes(q) ||
                (m.barcode && m.barcode.includes(q))
            );
            tbody.innerHTML = renderInventoryTableRows(filtered);
            break;
        case 'assignments':
            filtered = currentReportData.filter(a =>
                (a.materials?.name || '').toLowerCase().includes(q) ||
                a.assigned_to.toLowerCase().includes(q)
            );
            tbody.innerHTML = renderAssignmentsTableRows(filtered);
            break;
        case 'requests':
            filtered = currentReportData.filter(r =>
                (r.profiles?.full_name || '').toLowerCase().includes(q) ||
                (r.materials?.name || '').toLowerCase().includes(q) ||
                r.reason.toLowerCase().includes(q)
            );
            tbody.innerHTML = renderRequestsTableRows(filtered);
            break;
        case 'stock':
            filtered = currentReportData.filter(s =>
                s.type.toLowerCase().includes(q)
            );
            tbody.innerHTML = renderStockTableRows(filtered);
            break;
        case 'personnel':
            filtered = currentReportData.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.title || '').toLowerCase().includes(q)
            );
            tbody.innerHTML = filtered.map(p => `
                <tr>
                    <td>
                        <strong>${p.name}</strong><br>
                        <small>${p.title || '-'}</small>
                    </td>
                    <td>
                        ${p.items.map(i => `${i.materials?.name} (${i.quantity} adet)`).join(', ')}
                    </td>
                    <td style="text-align: center;">${p.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                </tr>
            `).join('');
            break;
    }
}

// Generate Critical Stock Report
async function generateCriticalStockReport() {
    const preview = document.getElementById('report-preview');
    const searchContainer = document.getElementById('report-search-container');

    preview.innerHTML = '<div class="loading">Kritik stoklar analiz ediliyor...</div>';

    const { data: materials } = await supabase
        .from('materials')
        .select('*')
        .lte('quantity', 2)
        .order('quantity', { ascending: true });

    currentReportData = materials || [];
    currentReportType = 'inventory'; // Can reuse inventory filtering
    searchContainer.style.display = 'block';

    preview.innerHTML = `
        <div class="page-header">
            <h2 style="color: var(--danger);">⚠️ Kritik Stok Raporu (≤ 2 Adet)</h2>
            <div class="export-group">
                <button class="btn-export pdf" id="download-critical-pdf" data-tooltip="PDF Raporu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </button>
                <button class="btn-export excel" id="download-critical-excel" data-tooltip="Excel Raporu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                </button>
            </div>
        </div>
        <p>Sistemde stok miktarı kritik seviyeye ulaşmış <strong>${materials?.length || 0}</strong> farklı malzeme türü bulunmaktadır.</p>
        <br>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Tür</th>
                        <th>Malzeme Adı</th>
                        <th>Marka/Model</th>
                        <th>Mevcut Stok</th>
                    </tr>
                </thead>
                <tbody id="report-table-body">
                    ${materials.map(m => `
                        <tr style="background-color: rgba(239, 68, 68, 0.05);">
                            <td>${m.type}</td>
                            <td>${m.name}</td>
                            <td>${m.brand_model}</td>
                            <td style="color: var(--danger); font-weight: bold;">${m.quantity}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('download-critical-pdf')?.addEventListener('click', () => {
        const columns = [
            { header: 'Tür', key: 'type' },
            { header: 'Malzeme Adı', key: 'name' },
            { header: 'Marka/Model', key: 'brand_model' },
            { header: 'Mevcut Stok', key: 'quantity', style: 'width: 80px; text-align: center; font-weight: bold; color: #ef4444;' }
        ];
        exportToPDF('Kritik Stok Raporu', materials, columns);
    });

    document.getElementById('download-critical-excel')?.addEventListener('click', () => {
        const columns = [
            { header: 'Tür', key: 'type' },
            { header: 'Malzeme Adı', key: 'name' },
            { header: 'Marka/Model', key: 'brand_model' },
            { header: 'Mevcut Stok', key: 'quantity' }
        ];
        exportToExcel('Kritik_Stok_Raporu', materials, columns);
    });
}

// Generate Personnel Summary Report
async function generatePersonnelReport() {
    const preview = document.getElementById('report-preview');
    const searchContainer = document.getElementById('report-search-container');

    preview.innerHTML = '<div class="loading">Personel zimmet bilgileri toplanıyor...</div>';

    const { data: assignments } = await supabase
        .from('assignments')
        .select(`
            *,
            materials (name, brand_model)
        `)
        .eq('status', 'aktif')
        .order('assigned_to', { ascending: true });

    // Group by person
    const byPerson = {};
    assignments?.forEach(a => {
        if (!byPerson[a.assigned_to]) {
            byPerson[a.assigned_to] = { name: a.assigned_to, title: a.target_title, items: [] };
        }
        byPerson[a.assigned_to].items.push(a);
    });

    const personnelData = Object.values(byPerson);
    currentReportData = personnelData;
    currentReportType = 'personnel';
    searchContainer.style.display = 'block';

    preview.innerHTML = `
        <div class="page-header">
            <h2>Personel Zimmet Özeti</h2>
            <div class="export-group">
                <button class="btn-export pdf" id="download-personnel-pdf" data-tooltip="PDF Raporu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </button>
                <button class="btn-export excel" id="download-personnel-excel" data-tooltip="Excel Raporu">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                </button>
            </div>
        </div>
        <p>Sistemde aktif zimmeti bulunan <strong>${personnelData.length}</strong> personel listelenmektedir.</p>
        <br>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Personel / Unvan</th>
                        <th>Zimmetli Malzemeler</th>
                        <th>Toplam Adet</th>
                    </tr>
                </thead>
                <tbody id="report-table-body">
                    ${personnelData.map(p => `
                        <tr>
                            <td>
                                <strong>${p.name}</strong><br>
                                <small>${p.title || '-'}</small>
                            </td>
                            <td>
                                ${p.items.map(i => `${i.materials?.name} (${i.quantity} adet)`).join(', ')}
                            </td>
                            <td style="text-align: center;">${p.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('download-personnel-pdf')?.addEventListener('click', () => {
        const columns = [
            { header: 'Personel / Unvan', key: 'name', style: 'width: 150px;', transform: (val, item) => `${val}\n${item.title || '-'}` },
            { header: 'Zimmetli Malzemeler', key: 'items', transform: val => val.map(i => `${i.materials?.name} [${i.materials?.brand_model || '-'}] (${i.quantity} ad.)`).join('\n') },
            { header: 'Adet', key: 'items', style: 'width: 40px; text-align: center;', transform: val => val.reduce((sum, i) => sum + i.quantity, 0) }
        ];
        exportToPDF('Personel Zimmet Özeti', personnelData, columns);
    });

    document.getElementById('download-personnel-excel')?.addEventListener('click', () => {
        const columns = [
            { header: 'Personel', key: 'name' },
            { header: 'Unvan', key: 'title' },
            { header: 'Zimmetli Malzemeler', key: 'items', transform: val => val.map(i => `${i.materials?.name} [${i.materials?.brand_model || '-'}] (${i.quantity} ad.)`).join(' | ') },
            { header: 'Toplam Adet', key: 'items', transform: val => val.reduce((sum, i) => sum + i.quantity, 0) }
        ];
        exportToExcel('Personel_Zimmet_Ozeti', personnelData, columns);
    });
}

// Replaced by centralized exportToPDF

// Export module
window.reportsModule = { render };

export { render };
