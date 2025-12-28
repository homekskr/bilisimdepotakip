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
            <button class="btn btn-primary" id="download-inventory-pdf">📄 PDF Rapor Al</button>
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
        downloadPDF('Envanter Raporu', materials, 'inventory');
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
            <button class="btn btn-primary" id="download-assignments-pdf">📄 PDF Rapor Al</button>
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
        downloadPDF('Zimmet Raporu', assignments, 'assignments');
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
            <button class="btn btn-primary" id="download-requests-pdf">📄 PDF Rapor Al</button>
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
        downloadPDF('Talep Raporu', requests, 'requests');
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
            <button class="btn btn-primary" id="download-stock-pdf">📄 PDF Rapor Al</button>
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
            <button class="btn btn-danger" id="download-critical-pdf">📄 PDF Rapor Al</button>
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
        downloadPDF('Kritik Stok Raporu', materials, 'critical');
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
            <button class="btn btn-primary" id="download-personnel-pdf">📄 PDF Rapor Al</button>
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
        downloadPDF('Personel Zimmet Özeti', personnelData, 'personnel');
    });
}

// Download PDF with Standardized Template
function downloadPDF(title, data, type) {
    const printWindow = window.open('', '_blank');
    const reportDate = new Date().toLocaleString('tr-TR');

    let tableHtml = '';

    // Header for PDF
    const pdfHeader = `
        <div class="pdf-report-date">RAPOR TARİHİ: ${reportDate}</div>
        <div class="pdf-header">
            KAHRAMANMARAŞ İL SAĞLIK MÜDÜRLÜĞÜ<br>
            BİLİŞİM DEPOSU ${title.toUpperCase()}
        </div>
    `;

    // Process data based on report type for the printable table
    switch (type) {
        case 'inventory':
            tableHtml = `
                <table>
                    <thead>
                        <tr>
                            <th style="width: 60px;">Durum</th>
                            <th style="width: 120px;">Tür</th>
                            <th>Malzeme Adı</th>
                            <th>Marka/Model</th>
                            <th style="width: 40px;">Adet</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(m => `
                            <tr>
                                <td>${m.condition}</td>
                                <td>${m.type}</td>
                                <td>${m.name}</td>
                                <td>${m.brand_model}</td>
                                <td style="text-align: center;">${m.quantity}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
        case 'assignments':
            tableHtml = `
                <table>
                    <thead>
                        <tr>
                            <th>Malzeme</th>
                            <th>Marka/Model</th>
                            <th>Zimmetlenen</th>
                            <th>Unvan</th>
                            <th style="width: 30px;">Adet</th>
                            <th style="width: 70px;">Tarih</th>
                            <th style="width: 60px;">Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(a => `
                            <tr>
                                <td>${a.materials?.name || '-'}</td>
                                <td>${a.materials?.brand_model || '-'}</td>
                                <td>${a.assigned_to}</td>
                                <td>${a.target_title || '-'}</td>
                                <td style="text-align: center;">${a.quantity}</td>
                                <td>${new Date(a.assigned_date).toLocaleDateString('tr-TR')}</td>
                                <td>${a.status === 'aktif' ? 'Aktif' : 'İade Edildi'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
        case 'requests':
            tableHtml = `
                <table>
                    <thead>
                        <tr>
                            <th>Talep Eden</th>
                            <th>Malzeme</th>
                            <th style="width: 40px;">Adet</th>
                            <th style="width: 80px;">Durum</th>
                            <th style="width: 70px;">Tarih</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(r => `
                            <tr>
                                <td>${r.profiles?.full_name || '-'}</td>
                                <td>${r.materials?.name || '-'}</td>
                                <td style="text-align: center;">${r.quantity}</td>
                                <td>${r.status.toUpperCase()}</td>
                                <td>${new Date(r.created_at).toLocaleDateString('tr-TR')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
        case 'stock':
            tableHtml = `
                <table>
                    <thead>
                        <tr>
                            <th>Malzeme Türü</th>
                            <th style="width: 80px;">Çeşit Sayısı</th>
                            <th style="width: 80px;">Toplam Stok</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(s => `
                            <tr>
                                <td>${s.type}</td>
                                <td style="text-align: center;">${s.count}</td>
                                <td style="text-align: center;">${s.quantity}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
        case 'critical':
            tableHtml = `
                <table>
                    <thead>
                        <tr>
                            <th>Tür</th>
                            <th>Malzeme Adı</th>
                            <th>Marka/Model</th>
                            <th style="width: 80px;">Mevcut Stok</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(m => `
                            <tr>
                                <td>${m.type}</td>
                                <td>${m.name}</td>
                                <td>${m.brand_model}</td>
                                <td style="text-align: center; font-weight: bold; color: #ef4444;">${m.quantity}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
        case 'personnel':
            tableHtml = `
                <table>
                    <thead>
                        <tr>
                            <th style="width: 150px;">Personel / Unvan</th>
                            <th>Zimmetli Malzemeler</th>
                            <th style="width: 40px;">Adet</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(p => `
                            <tr>
                                <td>
                                    <strong>${p.name}</strong><br>
                                    ${p.title || '-'}
                                </td>
                                <td>
                                    ${p.items.map(i => `${i.materials?.name} [${i.materials?.brand_model || '-'}] (${i.quantity} ad.)`).join('<br>')}
                                </td>
                                <td style="text-align: center;">${p.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 1cm;
                }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 10px;
                    color: #000;
                    margin: 0;
                    padding: 0;
                }
                .pdf-header {
                    text-align: center;
                    margin-bottom: 20px;
                    font-weight: bold;
                    border-bottom: 2px solid #000;
                    padding-bottom: 10px;
                    font-size: 12px;
                }
                .pdf-report-date {
                    text-align: right;
                    margin-bottom: 5px;
                    font-size: 9px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                }
                th, td {
                    border: 1px solid #000;
                    padding: 4px;
                    text-align: left;
                    word-wrap: break-word;
                }
                th {
                    background-color: #f2f2f2;
                }
                tr:nth-child(even) {
                    background-color: #fafafa;
                }
            </style>
        </head>
        <body>
            ${pdfHeader}
            ${tableHtml}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(() => window.close(), 500);
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
