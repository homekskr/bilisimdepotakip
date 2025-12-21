// Reports Module
import { supabase } from './supabase-client.js';

const pageContent = document.getElementById('page-content');

let currentReportData = [];
let currentReportType = '';

// Render reports page
async function render() {
    pageContent.innerHTML = `
        <div class="page-header">
            <h1>Raporlar</h1>
            <p>Detaylı raporlar ve analizler</p>
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
                <h3>📊 Stok Durumu</h3>
                <p>Malzeme türlerine göre stok analizi</p>
                <button class="btn btn-primary btn-sm">Rapor Al</button>
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
            <h2>Envanter Raporu</h2>
            <button class="btn btn-primary" id="download-inventory-pdf">PDF İndir</button>
        </div>
        <p><strong>Toplam Malzeme Türü:</strong> ${totalItems}</p>
        <p><strong>Toplam Adet:</strong> ${totalQuantity}</p>
        <p><strong>Rapor Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>
        <br>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Malzeme Adı</th>
                        <th>Tür</th>
                        <th>Marka/Model</th>
                        <th>Adet</th>
                        <th>Barkod</th>
                    </tr>
                </thead>
                <tbody id="report-table-body">
                    ${renderInventoryTableRows(materials)}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('download-inventory-pdf')?.addEventListener('click', () => {
        downloadPDF('Envanter Raporu', materials, 'inventory');
    });
}

function renderInventoryTableRows(materials) {
    if (!materials || materials.length === 0) {
        return '<tr><td colspan="5">Veri yok</td></tr>';
    }
    return materials.map(m => `
        <tr>
            <td data-label="Malzeme Adı">${m.name}</td>
            <td data-label="Tür">${m.type}</td>
            <td data-label="Marka/Model">${m.brand_model}</td>
            <td data-label="Adet">${m.quantity}</td>
            <td data-label="Barkod">${m.barcode || '-'}</td>
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
            <h2>Zimmet Raporu</h2>
            <button class="btn btn-primary" id="download-assignments-pdf">PDF İndir</button>
        </div>
        <p><strong>Aktif Zimmetler:</strong> ${activeCount}</p>
        <p><strong>İade Edilenler:</strong> ${returnedCount}</p>
        <p><strong>Rapor Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>
        <br>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Malzeme</th>
                        <th>Zimmetli</th>
                        <th>Adet</th>
                        <th>Zimmet Tarihi</th>
                        <th>İade Tarihi</th>
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
        downloadPDF('Zimmet Raporu', assignments, 'assignments');
    });
}

function renderAssignmentsTableRows(assignments) {
    if (!assignments || assignments.length === 0) {
        return '<tr><td colspan="6">Veri yok</td></tr>';
    }
    return assignments.map(a => `
        <tr>
            <td data-label="Malzeme">${a.materials?.name || 'Bilinmiyor'}</td>
            <td data-label="Zimmetli">${a.assigned_to}</td>
            <td data-label="Adet">${a.quantity}</td>
            <td data-label="Zimmet Tarihi">${new Date(a.assigned_date).toLocaleDateString('tr-TR')}</td>
            <td data-label="İade Tarihi">${a.return_date ? new Date(a.return_date).toLocaleDateString('tr-TR') : '-'}</td>
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
            <h2>Talep Raporu</h2>
            <button class="btn btn-primary" id="download-requests-pdf">PDF İndir</button>
        </div>
        <p><strong>Bekleyen:</strong> ${pending}</p>
        <p><strong>Onaylanan:</strong> ${approved}</p>
        <p><strong>Reddedilen:</strong> ${rejected}</p>
        <p><strong>Rapor Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>
        <br>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Talep Eden</th>
                        <th>Malzeme</th>
                        <th>Adet</th>
                        <th>Durum</th>
                        <th>Tarih</th>
                    </tr>
                </thead>
                <tbody id="report-table-body">
                    ${renderRequestsTableRows(requests)}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('download-requests-pdf')?.addEventListener('click', () => {
        downloadPDF('Talep Raporu', requests, 'requests');
    });
}

function renderRequestsTableRows(requests) {
    if (!requests || requests.length === 0) {
        return '<tr><td colspan="5">Veri yok</td></tr>';
    }
    return requests.map(r => `
        <tr>
            <td data-label="Talep Eden">${r.profiles?.full_name || 'Bilinmiyor'}</td>
            <td data-label="Malzeme">${r.materials?.name || 'Bilinmiyor'}</td>
            <td data-label="Adet">${r.quantity}</td>
            <td data-label="Durum">${r.status}</td>
            <td data-label="Tarih">${new Date(r.created_at).toLocaleDateString('tr-TR')}</td>
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
            <h2>Stok Durumu Raporu</h2>
            <button class="btn btn-primary" id="download-stock-pdf">PDF İndir</button>
        </div>
        <p><strong>Rapor Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>
        <br>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Malzeme Türü</th>
                        <th>Çeşit Sayısı</th>
                        <th>Toplam Adet</th>
                    </tr>
                </thead>
                <tbody id="report-table-body">
                    ${renderStockTableRows(stockData)}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('download-stock-pdf')?.addEventListener('click', () => {
        downloadPDF('Stok Durumu Raporu', stockData, 'stock');
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
    }
}

// Download PDF (simplified - using browser print)
function downloadPDF(title, data, type) {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');

    const content = document.getElementById('report-preview').innerHTML;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    color: #000;
                    background: #fff;
                }
                h2 { color: #333; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
                .page-header button { display: none; }
                @media print {
                    .page-header button { display: none; }
                }
            </style>
        </head>
        <body>
            ${content}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(() => window.close(), 100);
                };
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
}

// Export module
window.reportsModule = { render };

export { render };
