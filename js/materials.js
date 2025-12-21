// Materials Module
import { supabase, checkUserRole } from './supabase-client.js';

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
                <p>Depodaki tüm malzemeleri görüntüleyin ve yönetin</p>
            </div>
            ${canManage ? '<button class="btn btn-primary" id="add-material-btn">+ Yeni Malzeme</button>' : ''}
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
                            <th>Barkod</th>
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
                            <label for="material-quantity">Adet *</label>
                            <input type="number" id="material-quantity" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="material-barcode">Barkod</label>
                            <input type="text" id="material-barcode">
                        </div>
                        <div class="form-group">
                            <label for="material-specs">Malzeme Özellikleri</label>
                            <textarea id="material-specs" rows="4" placeholder="Malzeme detaylarını buraya yazın..."></textarea>
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
                    alert('Barkod bulunamadı: ' + barcode);
                }
            });
        }
    });

    document.getElementById('close-material-modal')?.addEventListener('click', closeMaterialModal);
    document.getElementById('cancel-material-btn')?.addEventListener('click', closeMaterialModal);
    document.getElementById('save-material-btn')?.addEventListener('click', saveMaterial);

    // Initial attachment of table listeners
    attachTableEventListeners();
}

// Render materials table
function renderMaterialsTable(materials, canManage) {
    if (!materials || materials.length === 0) {
        return '<tr><td colspan="7">Henüz malzeme eklenmemiş</td></tr>';
    }

    return materials.map(m => `
        <tr data-id="${m.id}">
            <td data-label="Durum"><span class="badge ${m.condition === 'YENİ' ? 'badge-success' : 'badge-warning'}">${m.condition}</span></td>
            <td data-label="Tür">${m.type}</td>
            <td data-label="Malzeme Adı">${m.name}</td>
            <td data-label="Marka/Model">${m.brand_model}</td>
            <td data-label="Adet"><span class="badge ${m.quantity > 0 ? 'badge-success' : 'badge-danger'}">${m.quantity}</span></td>
            <td data-label="Barkod">${m.barcode || '-'}</td>
            ${canManage ? `
                <td data-label="İşlemler">
                    <div class="table-actions">
                        <button class="btn btn-sm btn-secondary edit-material-btn" data-id="${m.id}">Düzenle</button>
                        <button class="btn btn-sm btn-danger delete-material-btn" data-id="${m.id}">Sil</button>
                    </div>
                </td>
            ` : ''}
        </tr>
    `).join('');
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
        loadMaterialData(materialId);
    } else {
        title.textContent = 'Yeni Malzeme';
        document.getElementById('material-id').value = '';
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
        alert('Malzeme yüklenemedi');
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
            alert('Bu işlem için yönetici yetkisi gereklidir.');
            return;
        }

        if (id) {
            // Update
            const { error } = await supabase
                .from('materials')
                .update(materialData)
                .eq('id', id);

            if (error) throw error;
        } else {
            // Insert
            const { error } = await supabase
                .from('materials')
                .insert([materialData]);

            if (error) throw error;
        }

        window.materialsData = null; // Invalidate cache
        closeMaterialModal();
        render(); // Reload page

    } catch (error) {
        alert('Hata: ' + error.message);
    }
}

// Delete material
async function deleteMaterial(id) {
    if (!confirm('Bu malzemeyi silmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const isAdmin = await checkUserRole('admin');
        if (!isAdmin) {
            alert('Bu işlem için yönetici yetkisi gereklidir.');
            return;
        }

        const { error } = await supabase
            .from('materials')
            .delete()
            .eq('id', id);

        if (error) throw error;

        render(); // Reload page

    } catch (error) {
        alert('Hata: ' + error.message);
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
window.materialsModule = { render };

export { render };
