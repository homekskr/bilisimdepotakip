// Materials Module
import { supabase, checkUserRole } from './supabase-client.js';
import { showToast, showConfirm } from './ui.js';

const pageContent = document.getElementById('page-content');

// Materials State
let materialsState = {
    searchQuery: '',
    typeFilter: 'all',
    conditionFilter: 'all',
    sortBy: 'created_desc'
};

// Render materials page
async function render() {
    const canManage = await checkUserRole('admin'); // Only admin can edit/add/delete

    // Fetch materials (using global cache for speed)
    if (!window.materialsData) {
        const { data: materials, error } = await supabase
            .from('materials')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            pageContent.innerHTML = `<div class="error">Hata: ${error.message}</div>`;
            return;
        }
        window.materialsData = materials;
    }

    const materials = window.materialsData;

    pageContent.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Malzemeler</h1>
            </div>
            <div>
                ${canManage ? '<button class="btn btn-primary" id="add-material-btn" style="margin-right: 8px;">+ Yeni Malzeme</button>' : ''}
                <button class="btn btn-info" id="download-inventory-pdf">📦 Envanter PDF</button>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <div class="search-container">
                    <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" id="search-materials" placeholder="Malzeme adı, türü veya barkod ile ara..." class="search-input">
                </div>
                <button class="btn btn-secondary btn-sm" id="scan-barcode-btn">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="3" y="4" width="2" height="12" fill="currentColor"/>
                        <rect x="6" y="4" width="1" height="12" fill="currentColor"/>
                        <rect x="8" y="4" width="2" height="12" fill="currentColor"/>
                        <rect x="11" y="4" width="1" height="12" fill="currentColor"/>
                        <rect x="13" y="4" width="2" height="12" fill="currentColor"/>
                        <rect x="16" y="4" width="1" height="12" fill="currentColor"/>
                    </svg>
                    Barkod Okut
                </button>
            </div>
            <div class="table-filters" style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap; padding: 0 var(--spacing-lg) var(--spacing-md); border-bottom: 1px solid var(--glass-border);">
                 <select id="mat-filter-type" class="btn btn-sm btn-secondary" style="background: var(--bg-secondary); text-align: left; flex: 1; min-width: 150px;">
                    <option value="all">Tüm Türler</option>
                    ${[...new Set(materials.map(m => m.type))].sort().map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <select id="mat-filter-condition" class="btn btn-sm btn-secondary" style="background: var(--bg-secondary); text-align: left;">
                    <option value="all">Tüm Durumlar</option>
                    <option value="YENİ">YENİ</option>
                    <option value="İKİNCİ EL">İKİNCİ EL</option>
                    <option value="ARIZALI">ARIZALI</option>
                </select>
                <select id="mat-sort" class="btn btn-sm btn-secondary" style="background: var(--bg-secondary); text-align: left;">
                    <option value="created_desc">En Yeni Eklenen</option>
                    <option value="updated_desc">Son Güncellenen</option>
                    <option value="quantity_desc">En Çok Stok</option>
                    <option value="quantity_asc">En Az Stok</option>
                    <option value="name_asc">İsme Göre (A-Z)</option>
                    <option value="type_asc">Türe Göre (A-Z)</option>
                </select>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Durum</th>
                            <th>Tür</th>
                            <th>Malzeme Adı</th>
                            <th>Marka/Model</th>
                            <th>Adet</th>
                            <th>Eklenme Tarihi</th>
                            ${canManage ? '<th>İşlemler</th>' : ''}
                        </tr>
                    </thead>
                    <tbody id="materials-tbody">
                        ${renderMaterialsTable(materials, canManage)}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Add/Edit Material Modal -->
        <div id="material-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="material-modal-title">Yeni Malzeme</h3>
                    <button class="modal-close" id="close-material-modal">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="material-form" class="auth-form">
                        <input type="hidden" id="material-id">
                        <div class="form-group">
                            <label for="material-condition">Malzeme Durumu *</label>
                            <select id="material-condition" required>
                                <option value="YENİ">YENİ</option>
                                <option value="İKİNCİ EL">İKİNCİ EL</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="material-type">Malzeme Türü *</label>
                            <select id="material-type" required>
                                <option value="">Seçiniz</option>
                                <option value="MASAÜSTÜ BİLGİSAYAR">MASAÜSTÜ BİLGİSAYAR</option>
                                <option value="DİZÜSTÜ BİLGİSAYAR">DİZÜSTÜ BİLGİSAYAR</option>
                                <option value="EKRAN LCD/LED">EKRAN LCD/LED</option>
                                <option value="YAZICI DÜZ">YAZICI DÜZ</option>
                                <option value="YAZICI ÇOK FONKSİYONLU">YAZICI ÇOK FONKSİYONLU</option>
                                <option value="BARKOD YAZICI">BARKOD YAZICI</option>
                                <option value="TARAYICI">TARAYICI</option>
                                <option value="SUNUCU BİLGİSAYAR">SUNUCU BİLGİSAYAR</option>
                                <option value="VERİ DEPOLAMA ÜNİTESİ">VERİ DEPOLAMA ÜNİTESİ</option>
                                <option value="ANAHTARLAMA CİHAZI">ANAHTARLAMA CİHAZI</option>
                                <option value="ACCESS POINT">ACCESS POINT</option>
                                <option value="KLAVYE">KLAVYE</option>
                                <option value="MOUSE">MOUSE</option>
                                <option value="DİĞER">DİĞER</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="material-name">Malzeme Adı *</label>
                            <input type="text" id="material-name" required>
                        </div>
                        <div class="form-group">
                            <label for="material-brand">Marka/Model *</label>
                            <input type="text" id="material-brand" required>
                        </div>
                        <div class="form-group">
                            <label for="material-quantity" id="label-quantity">Adet *</label>
                            <input type="number" id="material-quantity" min="0" required>
                        </div>
                        <div class="form-group hidden" id="stock-change-group">
                            <label for="material-stock-change">Stok İlave Et / Çıkar (+/-)</label>
                            <input type="number" id="material-stock-change" placeholder="Örn: 5 veya -3">
                        </div>
                        <div class="form-group hidden" id="stock-notes-group">
                            <label for="material-notes">Değişim Nedeni / Notlar</label>
                            <input type="text" id="material-notes" placeholder="Stok değişim nedeni...">
                        </div>
                        <div class="form-group">
                            <label for="material-barcode">Barkod</label>
                            <input type="text" id="material-barcode">
                        </div>
                        <div class="form-group">
                            <label for="material-specs">Malzeme Özellikleri</label>
                            <textarea id="material-specs" rows="4" placeholder="Malzeme detaylarını buraya yazın..."></textarea>
                        </div>
                        <div id="material-dates-info" class="hidden" style="margin-top: var(--spacing-md); padding: var(--spacing-sm); background: rgba(255,255,255,0.05); border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--text-secondary);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span>Eklenme:</span>
                                <span id="info-created-at">-</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Son Güncelleme:</span>
                                <span id="info-updated-at">-</span>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-material-btn">İptal</button>
                    <button class="btn btn-primary" id="save-material-btn">Kaydet</button>
                </div>
            </div>
        </div>
    `;

    // Event listeners
    if (canManage) {
        document.getElementById('add-material-btn')?.addEventListener('click', () => openMaterialModal());
    }

    document.getElementById('search-materials')?.addEventListener('input', (e) => {
        materialsState.searchQuery = e.target.value;
        updateMaterialsTable(canManage);
    });

    document.getElementById('mat-filter-type')?.addEventListener('change', (e) => {
        materialsState.typeFilter = e.target.value;
        updateMaterialsTable(canManage);
    });

    document.getElementById('mat-filter-condition')?.addEventListener('change', (e) => {
        materialsState.conditionFilter = e.target.value;
        updateMaterialsTable(canManage);
    });

    document.getElementById('mat-sort')?.addEventListener('change', (e) => {
        materialsState.sortBy = e.target.value;
        updateMaterialsTable(canManage);
    });

    document.getElementById('scan-barcode-btn')?.addEventListener('click', () => {
        if (window.barcodeModule && window.barcodeModule.openScanner) {
            window.barcodeModule.openScanner((barcode) => {
                // Search by barcode
                const found = materials.find(m => m.barcode === barcode);
                if (found) {
                    materialsState.searchQuery = barcode;
                    document.getElementById('search-materials').value = barcode;
                    updateMaterialsTable(canManage);
                } else {
                    showToast('Barkod bulunamadı: ' + barcode, 'warning');
                }
            });
        }
    });

    document.getElementById('close-material-modal')?.addEventListener('click', closeMaterialModal);
    document.getElementById('cancel-material-btn')?.addEventListener('click', closeMaterialModal);
    document.getElementById('save-material-btn')?.addEventListener('click', saveMaterial);
    document.getElementById('download-inventory-pdf')?.addEventListener('click', downloadInventoryPDF);

    // Initial attachment of table listeners
    attachTableEventListeners();
}

// Render materials table
function renderMaterialsTable(materials, canManage) {
    if (!materials || materials.length === 0) {
        return '<tr><td colspan="7">Henüz malzeme eklenmemiş</td></tr>';
    }

    return materials.map(m => {
        const isLowStock = m.quantity <= 3;
        const rowStyle = isLowStock ? 'style="background: rgba(239, 68, 68, 0.15);"' : '';

        return `
        <tr data-id="${m.id}" ${rowStyle}>
            <td data-label="Durum"><span class="badge ${m.condition === 'YENİ' ? 'badge-success' : 'badge-warning'}">${m.condition}</span></td>
            <td data-label="Tür">${m.type}</td>
            <td data-label="Malzeme Adı">${m.name}</td>
            <td data-label="Marka/Model">${m.brand_model}</td>
            <td data-label="Adet"><span class="badge ${m.quantity > 0 ? 'badge-success' : 'badge-danger'}">${m.quantity}</span></td>
            <td data-label="Eklenme Tarihi">${new Date(m.created_at).toLocaleDateString('tr-TR')}</td>
            ${canManage ? `
                <td data-label="İşlemler">
                    <div class="table-actions">
                        <button class="btn btn-sm btn-success edit-material-btn" data-id="${m.id}" title="Düzenle">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn btn-sm btn-danger delete-material-btn" data-id="${m.id}" title="Sil">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </button>
                    </div>
                </td>
            ` : ''}
        </tr>
    `;
    }).join('');
}

// Search materials
// Unified filter and update function
function updateMaterialsTable(canManage) {
    const materials = window.materialsData || [];

    let filtered = materials.filter(m => {
        // Search filter
        const query = materialsState.searchQuery.toLowerCase();
        const matchesSearch = !query ||
            m.name.toLowerCase().includes(query) ||
            m.type.toLowerCase().includes(query) ||
            m.brand_model.toLowerCase().includes(query) ||
            (m.barcode && m.barcode.includes(query));

        // Type filter
        const matchesType = materialsState.typeFilter === 'all' || m.type === materialsState.typeFilter;

        // Condition filter
        const matchesCondition = materialsState.conditionFilter === 'all' || m.condition === materialsState.conditionFilter;

        return matchesSearch && matchesType && matchesCondition;
    });

    // Sorting
    filtered.sort((a, b) => {
        switch (materialsState.sortBy) {
            case 'quantity_desc': return b.quantity - a.quantity;
            case 'quantity_asc': return a.quantity - b.quantity;
            case 'name_asc': return a.name.localeCompare(b.name, 'tr');
            case 'type_asc': return a.type.localeCompare(b.type, 'tr');
            case 'updated_desc': return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
            case 'created_desc': default: return new Date(b.created_at) - new Date(a.created_at);
        }
    });

    const tbody = document.getElementById('materials-tbody');
    if (tbody) {
        tbody.innerHTML = renderMaterialsTable(filtered, canManage);
        attachTableEventListeners();
    }
}

// Open material modal
function openMaterialModal(materialId = null) {
    const modal = document.getElementById('material-modal');
    const title = document.getElementById('material-modal-title');
    const form = document.getElementById('material-form');

    form.reset();

    if (materialId) {
        title.textContent = 'Malzeme Düzenle';
        document.getElementById('material-dates-info').classList.remove('hidden');
        document.getElementById('stock-change-group').classList.remove('hidden');
        document.getElementById('stock-notes-group').classList.remove('hidden');
        document.getElementById('label-quantity').textContent = 'Mevcut Stok';
        document.getElementById('material-quantity').readOnly = true;
        loadMaterialData(materialId);
    } else {
        title.textContent = 'Yeni Malzeme';
        document.getElementById('material-id').value = '';
        document.getElementById('material-dates-info').classList.add('hidden');
        document.getElementById('stock-change-group').classList.add('hidden');
        document.getElementById('stock-notes-group').classList.add('hidden');
        document.getElementById('label-quantity').textContent = 'Adet *';
        document.getElementById('material-quantity').readOnly = false;
    }

    modal.classList.remove('hidden');
}

// Close material modal
function closeMaterialModal() {
    const modal = document.getElementById('material-modal');
    modal.classList.add('hidden');
}

// Load material data for editing
async function loadMaterialData(id) {
    const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        showToast('Malzeme yüklenemedi', 'error');
        return;
    }

    document.getElementById('material-id').value = data.id;
    document.getElementById('material-condition').value = data.condition || 'YENİ';
    document.getElementById('material-name').value = data.name;
    document.getElementById('material-type').value = data.type;
    document.getElementById('material-brand').value = data.brand_model;
    document.getElementById('material-quantity').value = data.quantity;
    document.getElementById('material-barcode').value = data.barcode || '';
    document.getElementById('material-specs').value = data.specifications || '';

    // Set dates info
    document.getElementById('info-created-at').textContent = new Date(data.created_at).toLocaleString('tr-TR');
    document.getElementById('info-updated-at').textContent = data.updated_at ? new Date(data.updated_at).toLocaleString('tr-TR') : '-';
}

// Save material
async function saveMaterial() {
    const id = document.getElementById('material-id').value;
    const condition = document.getElementById('material-condition').value;
    const name = document.getElementById('material-name').value;
    const type = document.getElementById('material-type').value;
    const brand_model = document.getElementById('material-brand').value;
    const quantity = parseInt(document.getElementById('material-quantity').value);
    const barcode = document.getElementById('material-barcode').value;
    const specsText = document.getElementById('material-specs').value;

    const specifications = specsText || '';

    const materialData = {
        name,
        type,
        condition,
        brand_model,
        quantity,
        barcode: barcode || null,
        specifications
    };

    try {
        const isAdmin = await checkUserRole('admin');
        if (!isAdmin) {
            showToast('Bu işlem için yönetici yetkisi gereklidir.', 'error');
            return;
        }

        if (id) {
            // Update mode
            const stockChange = parseInt(document.getElementById('material-stock-change').value) || 0;
            const notes = document.getElementById('material-notes').value.trim();

            if (stockChange !== 0) {
                // Use RPC for stock update with logging
                const { data: rpcResult, error: rpcError } = await supabase.rpc('update_material_stock_secure', {
                    p_material_id: id,
                    p_user_id: window.currentUser.id,
                    p_change_amount: stockChange,
                    p_type: stockChange > 0 ? 'ekleme' : 'silme',
                    p_notes: notes || 'Manuel stok güncelleme'
                });

                if (rpcError) throw rpcError;
                if (rpcResult && !rpcResult.success) {
                    showToast(rpcResult.message, 'error');
                    return;
                }
            }

            // Update other fields
            const { error } = await supabase
                .from('materials')
                .update({
                    name,
                    type,
                    condition,
                    brand_model,
                    barcode: barcode || null,
                    specifications,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
            showToast('Malzeme başarıyla güncellendi', 'success');
        } else {
            // Insert mode
            const { data: newMaterial, error } = await supabase
                .from('materials')
                .insert([materialData])
                .select()
                .single();

            if (error) throw error;

            // Initial log for creation
            await supabase.from('stock_movements').insert([{
                material_id: newMaterial.id,
                user_id: window.currentUser.id,
                type: 'olusturma',
                change_amount: quantity,
                previous_quantity: 0,
                new_quantity: quantity,
                notes: 'İlk kayıt oluşturuldu'
            }]);

            showToast('Yeni malzeme başarıyla kaydedildi', 'success');
        }

        window.materialsData = null; // Invalidate cache
        closeMaterialModal();
        render(); // Reload page

    } catch (error) {
        showToast('Hata: ' + error.message, 'error');
    }
}

// Delete material
async function deleteMaterial(id) {
    const material = (window.materialsData || []).find(m => m.id === id);
    const materialName = material ? material.name : 'bu malzemeyi';

    const confirmed = await showConfirm(
        'Malzemeyi Sil?',
        `${materialName} isimli malzemi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
        'Evet, Sil'
    );

    if (!confirmed) return;

    try {
        const isAdmin = await checkUserRole('admin');
        if (!isAdmin) {
            showToast('Bu işlem için yönetici yetkisi gereklidir.', 'error');
            return;
        }

        const { error } = await supabase
            .from('materials')
            .delete()
            .eq('id', id);

        if (error) throw error;

        window.materialsData = null; // Invalidate cache so render() fetches fresh data
        render(); // Reload page

    } catch (error) {
        showToast('Hata: ' + error.message, 'error');
    }
}

// Attach event listeners to table buttons
function attachTableEventListeners() {
    document.querySelectorAll('.edit-material-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openMaterialModal(btn.dataset.id);
        });
    });

    document.querySelectorAll('.delete-material-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            deleteMaterial(btn.dataset.id);
        });
    });
}

// Export module
async function downloadInventoryPDF() {
    const materials = window.materialsData || [];
    if (materials.length === 0) {
        showToast('Raporlanacak malzeme bulunamadı', 'warning');
        return;
    }

    // Sort by Condition (Durum) and then Type (Tür)
    const sortedMaterials = [...materials].sort((a, b) => {
        if (a.condition !== b.condition) {
            return a.condition.localeCompare(b.condition, 'tr');
        }
        return a.type.localeCompare(b.type, 'tr');
    });

    const printWindow = window.open('', '_blank');
    const reportDate = new Date().toLocaleString('tr-TR');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bilişim Deposu Envanteri</title>
            <style>
                @page {
                    size: A4 vertical;
                    margin: 1cm;
                }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 11px;
                    color: #000;
                    margin: 0;
                    padding: 0;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    font-weight: bold;
                    border-bottom: 2px solid #000;
                    padding-bottom: 10px;
                }
                .report-date {
                    text-align: right;
                    margin-bottom: 5px;
                    font-size: 10px;
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
                .durum-col { width: 45px; }
                .tur-col { width: 100px; }
                .adet-col { width: 35px; text-align: center; }
                .tarih-col { width: 70px; }
            </style>
        </head>
        <body>
            <div class="report-date">RAPOR TARİHİ: ${reportDate}</div>
            <div class="header">
                KAHRAMANMARAŞ İL SAĞLIK MÜDÜRLÜĞÜ<br>
                BİLİŞİM DEPOSU MALZEME ENVANTERİ
            </div>
            <table>
                <thead>
                    <tr>
                        <th class="durum-col">Durum</th>
                        <th class="tur-col">Tür</th>
                        <th>Malzeme Adı</th>
                        <th>Marka/Model</th>
                        <th class="adet-col">Adet</th>
                        <th class="tarih-col">Eklenme</th>
                        <th class="tarih-col">Güncelleme</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedMaterials.map(m => `
                        <tr>
                            <td>${m.condition}</td>
                            <td>${m.type}</td>
                            <td>${m.name}</td>
                            <td>${m.brand_model}</td>
                            <td style="text-align: center;">${m.quantity}</td>
                            <td>${new Date(m.created_at).toLocaleDateString('tr-TR')}</td>
                            <td>${new Date(m.updated_at || m.created_at).toLocaleDateString('tr-TR')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
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

window.materialsModule = { render };

export { render };
