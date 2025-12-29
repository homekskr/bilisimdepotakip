// Assignments Module (Zimmetler)
import { supabase, checkUserRole } from './supabase-client.js';
import { showToast, showConfirm } from './ui.js';
import { exportToPDF, exportToExcel } from './utils/export-logic.js';

const pageContent = document.getElementById('page-content');

// Render assignments page
async function render(forceRefresh = false) {
    const canManage = await checkUserRole(['admin', 'depo']);

    // Always fetch fresh data to ensure joins work properly
    const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
            *,
            materials (name, type, brand_model),
            profiles!assignments_assigned_by_fkey (full_name),
            requests (id)
        `)
        .order('assigned_date', { ascending: false });

    if (error) {
        console.error('Assignments fetch error:', error);
        pageContent.innerHTML = `<div class="error">Hata: ${error.message}</div>`;
        return;
    }

    pageContent.innerHTML = `
        <div class="page-header">
            <div>
                ${canManage ? '<button class="btn btn-primary" id="add-assignment-btn" style="margin-right: 8px;">+ Yeni Zimmet</button>' : ''}
                <button class="btn btn-info" id="download-assignments-pdf" style="margin-right: 8px;">📦 PDF</button>
                <button class="btn btn-success" id="download-assignments-excel">📊 Excel</button>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <div class="search-container">
                    <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" id="search-assignments" placeholder="Malzeme veya kişi ara..." class="search-input">
                </div>
                <select id="sort-assignments" class="btn btn-sm btn-secondary" style="background: var(--bg-secondary); text-align: left; min-width: 180px; height: 38px;">
                    <option value="date-desc">Tarihe Göre (İlk Önce Yeni)</option>
                    <option value="date-asc">Tarihe Göre (İlk Önce Eski)</option>
                    <option value="material">Malzemeye Göre (A-Z)</option>
                    <option value="person">Zimmetliye Göre (A-Z)</option>
                </select>
                <div>
                    <button class="btn btn-sm ${currentFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" data-filter="all">Tümü</button>
                    <button class="btn btn-sm ${currentFilter === 'aktif' ? 'btn-primary' : 'btn-secondary'}" data-filter="aktif">Aktif</button>
                    <button class="btn btn-sm ${currentFilter === 'iade_edildi' ? 'btn-primary' : 'btn-secondary'}" data-filter="iade_edildi">İade Edildi</button>
                </div>
            </div>
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
                            ${canManage ? '<th>İşlemler</th>' : ''}
                        </tr>
                    </thead>
                    <tbody id="assignments-tbody">
                        ${renderAssignmentsTable(assignments, canManage)}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Add Assignment Modal -->
        <div id="assignment-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Yeni Zimmet</h3>
                    <button class="modal-close" id="close-assignment-modal">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="assignment-form" class="auth-form">
                        <div class="form-group">
                            <label for="assignment-material">Malzeme *</label>
                            <select id="assignment-material" required></select>
                        </div>
                        <div class="form-group">
                            <label for="assignment-institution">Kurum *</label>
                            <select id="assignment-institution" required>
                                <option value="">Kurum Seçiniz</option>
                                <option value="İL SAĞLIK MÜDÜRLÜĞÜ">İL SAĞLIK MÜDÜRLÜĞÜ</option>
                                <option value="HALK SAĞLIĞI LABORATUVARI">HALK SAĞLIĞI LABORATUVARI</option>
                                <option value="ONİKİŞUBAT İLÇE SAĞLIK MÜDÜRLÜĞÜ">ONİKİŞUBAT İLÇE SAĞLIK MÜDÜRLÜĞÜ</option>
                                <option value="DULKADİROĞLU İLÇE SAĞLIK MÜDÜRLÜĞÜ">DULKADİROĞLU İLÇE SAĞLIK MÜDÜRLÜĞÜ</option>
                                <option value="ELBİSTAN İLÇE SAĞLIK MÜDÜRLÜĞÜ">ELBİSTAN İLÇE SAĞLIK MÜDÜRLÜĞÜ</option>
                                <option value="AFŞİN İLÇE SAĞLIK MÜDÜRLÜĞÜ">AFŞİN İLÇE SAĞLIK MÜDÜRLÜĞÜ</option>
                                <option value="GÖKSUN İLÇE SAĞLIK MÜDÜRLÜĞÜ">GÖKSUN İLÇE SAĞLIK MÜDÜRLÜĞÜ</option>
                                <option value="ANDIRIN İLÇE SAĞLIK MÜDÜRLÜĞÜ">ANDIRIN İLÇE SAĞLIK MÜDÜRLÜĞÜ</option>
                                <option value="TÜRKOĞLU İLÇE SAĞLIK MÜDÜRLÜĞÜ">TÜRKOĞLU İLÇE SAĞLIK MÜDÜRLÜĞÜ</option>
                                <option value="PAZARCIK İLÇE SAĞLIK MÜDÜRLÜĞÜ">PAZARCIK İLÇE SAĞLIK MÜDÜRLÜĞÜ</option>
                                <option value="ÇAĞLAYANCERİT TOPLUM SAĞLIĞI MERKEZİ">ÇAĞLAYANCERİT TOPLUM SAĞLIĞI MERKEZİ</option>
                                <option value="NURHAK TOPLUM SAĞLIĞI MERKEZİ">NURHAK TOPLUM SAĞLIĞI MERKEZİ</option>
                                <option value="EKİNÖZÜ TOPLUM SAĞLIĞI MERKEZİ">EKİNÖZÜ TOPLUM SAĞLIĞI MERKEZİ</option>
                                <option value="KAHRAMANMARAŞ DEVLET HASTANESİ">KAHRAMANMARAŞ DEVLET HASTANESİ</option>
                                <option value="NECİP FAZIL ŞEHİR HASTANESİ">NECİP FAZIL ŞEHİR HASTANESİ</option>
                                <option value="KAHRAMANMARAŞ ADSH">KAHRAMANMARAŞ ADSH</option>
                                <option value="ELBİSTAN DEVLET HASTANESİ">ELBİSTAN DEVLET HASTANESİ</option>
                                <option value="ELBİSTAN ADSM">ELBİSTAN ADSM</option>
                                <option value="AFŞİN DEVLET HASTANESİ">AFŞİN DEVLET HASTANESİ</option>
                                <option value="GÖKSUN DEVLET HASTANESİ">GÖKSUN DEVLET HASTANESİ</option>
                                <option value="ANDIRIN DEVLET HASTANESİ">ANDIRIN DEVLET HASTANESİ</option>
                                <option value="TÜRKOĞLU DEVLET HASTANESİ">TÜRKOĞLU DEVLET HASTANESİ</option>
                                <option value="PAZARCIK DEVLET HASTANESİ">PAZARCIK DEVLET HASTANESİ</option>
                                <option value="ÇAĞLAYANCERİT DEVLET HASTANESİ">ÇAĞLAYANCERİT DEVLET HASTANESİ</option>
                                <option value="NURHAK DEVLET HASTANESİ">NURHAK DEVLET HASTANESİ</option>
                                <option value="EKİNÖZÜ DEVLET HASTANESİ">EKİNÖZÜ DEVLET HASTANESİ</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="assignment-building">Bina *</label>
                            <select id="assignment-building" required>
                                <option value="">Bina Seçiniz</option>
                                <option value="ANA HİZMET BİNASI">ANA HİZMET BİNASI</option>
                                <option value="EK HİZMET BİNASI">EK HİZMET BİNASI</option>
                                <option value="HALK SAĞLIĞI EK HİZMET BİNASI">HALK SAĞLIĞI EK HİZMET BİNASI</option>
                                <option value="SAĞLIK HİZMETLERİ EK HİZMET BİNASI">SAĞLIK HİZMETLERİ EK HİZMET BİNASI</option>
                                <option value="DESTEK HİZMETLERİ EK HİZMET BİNASI">DESTEK HİZMETLERİ EK HİZMET BİNASI</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="assignment-unit">Birim *</label>
                            <input type="text" id="assignment-unit" required placeholder="Örn: Bilgi İşlem">
                        </div>
                        <div class="form-group">
                            <label for="assignment-personnel">Zimmetli Personel *</label>
                            <input type="text" id="assignment-personnel" required placeholder="Adı Soyadı">
                        </div>
                        <div class="form-group">
                            <label for="assignment-title">Personel Ünvanı *</label>
                            <input type="text" id="assignment-title" required placeholder="Örn: Mühendis">
                        </div>
                        <div class="form-group">
                            <label for="assignment-quantity">Adet *</label>
                            <input type="number" id="assignment-quantity" min="1" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-assignment-btn">İptal</button>
                    <button class="btn btn-primary" id="save-assignment-btn">Zimmet Çıkışı Yap</button>
                </div>
            </div>
        </div>
        
        <!-- Assignment Detail Modal -->
        <div id="assignment-detail-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Zimmet Detayları</h3>
                    <button class="modal-close" id="close-assignment-detail-modal">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body" id="assignment-detail-body">
                    <!-- Detaylar buraya gelecek -->
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="close-assignment-detail-btn">Kapat</button>
                </div>
            </div>
        </div>
    `;

    // Store assignments data
    window.assignmentsData = assignments;

    // Event listeners
    if (canManage) {
        document.getElementById('add-assignment-btn')?.addEventListener('click', () => openAssignmentModal());
    }

    document.getElementById('search-assignments')?.addEventListener('input', (e) => {
        filterAssignments(e.target.value);
    });

    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            filterAssignments(document.getElementById('search-assignments').value);

            // Update button styles
            document.querySelectorAll('[data-filter]').forEach(b => {
                b.className = b.dataset.filter === currentFilter ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
            });
        });
    });

    document.getElementById('sort-assignments')?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterAssignments(document.getElementById('search-assignments').value);
    });

    document.getElementById('close-assignment-modal')?.addEventListener('click', closeAssignmentModal);
    document.getElementById('cancel-assignment-btn')?.addEventListener('click', closeAssignmentModal);
    document.getElementById('save-assignment-btn')?.addEventListener('click', saveAssignment);
    document.getElementById('download-assignments-pdf')?.addEventListener('click', downloadAssignmentsPDF);
    document.getElementById('download-assignments-excel')?.addEventListener('click', downloadAssignmentsExcel);

    // Assignment detail modal events
    document.getElementById('close-assignment-detail-modal')?.addEventListener('click', () => document.getElementById('assignment-detail-modal').classList.add('hidden'));
    document.getElementById('close-assignment-detail-btn')?.addEventListener('click', () => document.getElementById('assignment-detail-modal').classList.add('hidden'));

    // Check for prefill data (Auto-open modal)
    if (canManage && window.assignmentPrefillData) {
        setTimeout(() => {
            openAssignmentModal(window.assignmentPrefillData);
            window.assignmentPrefillData = null; // Clear
        }, 300); // Slight delay to ensure DOM is ready
    }

    attachTableEventListeners();
}

let currentFilter = 'all';
let currentSort = 'date-desc';

// Render assignments table
function renderAssignmentsTable(assignments, canManage) {
    if (!assignments || assignments.length === 0) {
        return '<tr><td colspan="7">Henüz zimmet kaydı yok</td></tr>';
    }

    return assignments.map(a => `
        <tr data-id="${a.id}">
            <td data-label="Malzeme">
                <div>${a.materials?.name || (a.materials ? 'İsimsiz' : ('ID: ' + a.material_id))}</div>
                <div class="text-sub">${a.materials?.brand_model || ''}</div>
            </td>
            <td data-label="Zimmetli">
                <div>${a.assigned_to}</div>
                <div class="text-sub">${a.target_title || ''}</div>
            </td>
            <td data-label="Adet"><span class="badge badge-info">${a.quantity}</span></td>
            <td data-label="Zimmet Tarihi">${new Date(a.assigned_date).toLocaleDateString('tr-TR')}</td>
            <td data-label="İade Tarihi">${a.return_date ? new Date(a.return_date).toLocaleDateString('tr-TR') : '-'}</td>
            <td data-label="Durum"><span class="badge ${a.status === 'aktif' ? 'badge-success' : 'badge-warning'}">${a.status === 'aktif' ? 'Aktif' : 'İade Edildi'}</span></td>
            ${canManage ? `
                <td data-label="İşlemler">
                    <div class="table-actions">
                        <button class="btn btn-sm btn-info view-assignment-detail-btn" data-id="${a.id}">Detay</button>
                        ${a.status === 'aktif' ? `<button class="btn btn-sm btn-warning return-assignment-btn" data-id="${a.id}">İade Al</button>` : ''}
                    </div>
                </td>
            ` : `
                <td data-label="İşlemler">
                    <div class="table-actions">
                        <button class="btn btn-sm btn-info view-assignment-detail-btn" data-id="${a.id}">Detay</button>
                    </div>
                </td>
            `}
        </tr>
    `).join('');
}

// Filter assignments
function filterAssignments(query) {
    let filtered = window.assignmentsData || [];

    // Filter by status
    if (currentFilter !== 'all') {
        filtered = filtered.filter(a => a.status === currentFilter);
    }

    // Filter by search query
    if (query) {
        filtered = filtered.filter(a =>
            a.materials?.name.toLowerCase().includes(query.toLowerCase()) ||
            a.assigned_to.toLowerCase().includes(query.toLowerCase())
        );
    }

    // Sort filtered results
    filtered.sort((a, b) => {
        switch (currentSort) {
            case 'date-desc':
                return new Date(b.assigned_date) - new Date(a.assigned_date);
            case 'date-asc':
                return new Date(a.assigned_date) - new Date(b.assigned_date);
            case 'material':
                const nameA = a.materials?.name || '';
                const nameB = b.materials?.name || '';
                return nameA.localeCompare(nameB, 'tr');
            case 'person':
                return a.assigned_to.localeCompare(b.assigned_to, 'tr');
            default:
                return 0;
        }
    });

    const canManage = ['admin', 'depo'].includes(window.currentProfile?.role);
    const tbody = document.getElementById('assignments-tbody');
    tbody.innerHTML = renderAssignmentsTable(filtered, canManage);
    attachTableEventListeners();
}

// Open assignment modal
async function openAssignmentModal(prefillData = null) {
    const modal = document.getElementById('assignment-modal');
    const materialSelect = document.getElementById('assignment-material');

    // Load materials
    const { data: materials } = await supabase
        .from('materials')
        .select('*')
        .gt('quantity', 0)
        .order('name');

    materialSelect.innerHTML = '<option value="">Malzeme Seçin</option>' +
        materials.map(m => `<option value="${m.id}" data-max="${m.quantity}">${m.name} [${m.condition}] - ${m.brand_model} (Stok: ${m.quantity})</option>`).join('');

    document.getElementById('assignment-form').reset();

    // Apply prefill data if exists
    if (prefillData) {
        if (prefillData.materialId) {
            materialSelect.value = prefillData.materialId;
        }
        if (prefillData.quantity) {
            document.getElementById('assignment-quantity').value = prefillData.quantity;
        }
        if (prefillData.institution) document.getElementById('assignment-institution').value = prefillData.institution;
        if (prefillData.building) document.getElementById('assignment-building').value = prefillData.building;
        if (prefillData.unit) document.getElementById('assignment-unit').value = prefillData.unit;
        if (prefillData.personnel) document.getElementById('assignment-personnel').value = prefillData.personnel;
        if (prefillData.title) document.getElementById('assignment-title').value = prefillData.title;

        // Add hidden request id if needed for tracking (form usually doesn't have it, but we can store it in dataset)
        if (prefillData.requestId) {
            document.getElementById('assignment-form').dataset.requestId = prefillData.requestId;
        }
    }

    modal.classList.remove('hidden');
}

// Close assignment modal
function closeAssignmentModal() {
    document.getElementById('assignment-modal').classList.add('hidden');
}

// Save assignment
async function saveAssignment() {
    const saveBtn = document.getElementById('save-assignment-btn');
    const materialId = document.getElementById('assignment-material').value;
    const institution = document.getElementById('assignment-institution').value;
    const building = document.getElementById('assignment-building').value;
    const unit = document.getElementById('assignment-unit').value;
    const personnel = document.getElementById('assignment-personnel').value;
    const title = document.getElementById('assignment-title').value;
    const quantity = parseInt(document.getElementById('assignment-quantity').value);
    const requestId = document.getElementById('assignment-form').dataset.requestId || null;

    if (!materialId || !institution || !building || !unit || !personnel || !title || !quantity) {
        showToast('Lütfen tüm alanları doldurunuz', 'warning');
        return;
    }

    // Disable button to prevent double submission
    saveBtn.disabled = true;
    const originalBtnText = saveBtn.textContent;
    saveBtn.textContent = 'İşleniyor...';

    try {
        // Use RPC for atomic transaction (Stok kontrolü + Zimmet + Stok düşme + Talep güncelleme)
        const { data: result, error } = await supabase.rpc('create_assignment_secure', {
            p_material_id: materialId,
            p_assigned_to: personnel,
            p_institution: institution,
            p_building: building,
            p_unit: unit,
            p_target_personnel: personnel,
            p_target_title: title,
            p_quantity: quantity,
            p_assigned_by: window.currentUser.id,
            p_request_id: requestId
        });

        if (error) throw error;

        if (result && !result.success) {
            showToast(result.message, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = originalBtnText;
            return;
        }

        window.assignmentsData = null; // Invalidate cache
        window.requestsData = null; // Invalidate requests cache
        window.materialsData = null; // Invalidate materials cache

        showToast('Zimmet çıkışı başarıyla tamamlandı', 'success');
        closeAssignmentModal();
        render(true); // Reload with force refresh

    } catch (error) {
        console.error('Assignment error:', error);
        showToast('Hata: ' + error.message, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = originalBtnText;
    }
}

// Return assignment
async function returnAssignment(id) {
    const assignment = (window.assignmentsData || []).find(a => a.id === id);
    const materialName = assignment?.materials?.name || 'Malzemeyi';

    const confirmed = await showConfirm(
        'İade Al?',
        `${materialName} isimli zimmeti iade almak istediğinizden emin misiniz?`,
        'Evet, İade Al'
    );

    if (!confirmed) return;

    try {
        // Get assignment details
        const { data: assignment } = await supabase
            .from('assignments')
            .select('material_id, quantity')
            .eq('id', id)
            .single();

        // Update assignment status
        const { error: assignError } = await supabase
            .from('assignments')
            .update({
                status: 'iade_edildi',
                return_date: new Date().toISOString()
            })
            .eq('id', id);

        if (assignError) throw assignError;

        // Return to stock
        const { data: material } = await supabase
            .from('materials')
            .select('quantity')
            .eq('id', assignment.material_id)
            .single();

        const { error: updateError } = await supabase
            .from('materials')
            .update({ quantity: material.quantity + assignment.quantity })
            .eq('id', assignment.material_id);

        if (updateError) throw updateError;

        // If this assignment was from a request, reactivate the request
        if (assignment.request_id) {
            const { error: reqError } = await supabase
                .from('requests')
                .update({ status: 'iade_alindi' })
                .eq('id', assignment.request_id);

            if (reqError) console.error('Error reactivating request:', reqError);
        }

        window.assignmentsData = null; // Invalidate cache
        window.requestsData = null; // Also invalidate requests cache
        window.materialsData = null; // Also invalidate materials cache
        showToast('Zimmet iade alındı ve stok güncellendi', 'success');
        render(true); // Reload with force refresh

    } catch (error) {
        showToast('Hata: ' + error.message, 'error');
    }
}

// View assignment details
async function viewAssignmentDetails(assignmentId) {
    const modal = document.getElementById('assignment-detail-modal');
    const body = document.getElementById('assignment-detail-body');

    body.innerHTML = '<div class="loading-spinner">Yükleniyor...</div>';
    modal.classList.remove('hidden');

    try {
        const { data: assignment, error } = await supabase
            .from('assignments')
            .select(`
                *,
                materials (name, brand_model, barcode, type, condition),
                profiles!assignments_assigned_by_fkey (full_name)
            `)
            .eq('id', assignmentId)
            .single();

        if (error) throw error;

        if (!assignment) {
            body.innerHTML = '<div class="alert alert-warning">Zimmet kaydı bulunamadı.</div>';
            return;
        }

        body.innerHTML = `
            <div class="detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">MALZEME</label>
                    <div style="font-weight: 500;">${assignment.materials?.name || 'Bilinmiyor'}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${assignment.materials?.brand_model || '-'}</div>
                </div>
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">TÜR</label>
                    <div style="font-weight: 500;">${assignment.materials?.type || '-'}</div>
                </div>
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">BARKOD</label>
                    <div style="font-weight: 500;">${assignment.materials?.barcode || '-'}</div>
                </div>
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">DURUM</label>
                    <div style="font-weight: 500;">${assignment.materials?.condition || '-'}</div>
                </div>
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">ZİMMETLİ KİŞİ</label>
                    <div style="font-weight: 500;">${assignment.target_personnel || assignment.assigned_to}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${assignment.target_title || '-'}</div>
                </div>
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">KURUM</label>
                    <div style="font-weight: 500;">${assignment.institution || '-'}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${assignment.building || '-'} / ${assignment.unit || '-'}</div>
                </div>
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">TESLİM EDEN</label>
                    <div style="font-weight: 500;">${assignment.profiles?.full_name || 'Bilinmiyor'}</div>
                </div>
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">ZİMMET TARİHİ</label>
                    <div style="font-weight: 500;">${new Date(assignment.assigned_date).toLocaleDateString('tr-TR')}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${new Date(assignment.assigned_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">ADET</label>
                    <div style="font-weight: 500;">${assignment.quantity}</div>
                </div>
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">İADE TARİHİ</label>
                    <div style="font-weight: 500;">${assignment.return_date ? new Date(assignment.return_date).toLocaleDateString('tr-TR') : '-'}</div>
                    ${assignment.return_date ? `<div style="font-size: 0.85rem; color: var(--text-secondary);">${new Date(assignment.return_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>` : ''}
                </div>
                <div class="detail-item" style="grid-column: span 2;">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">DURUM</label>
                    <span class="badge ${assignment.status === 'aktif' ? 'badge-success' : 'badge-warning'}">
                        ${assignment.status === 'aktif' ? 'Zimmet Aktif' : 'İade Alındı'}
                    </span>
                </div>
            </div>
        `;

    } catch (error) {
        body.innerHTML = `<div class="error">Detaylar yüklenirken hata oluştu: ${error.message}</div>`;
    }
}

// Attach event listeners
function attachTableEventListeners() {
    document.querySelectorAll('.return-assignment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            returnAssignment(btn.dataset.id);
        });
    });

    document.querySelectorAll('.view-assignment-detail-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            viewAssignmentDetails(btn.dataset.id);
        });
    });
}

// Export to PDF
async function downloadAssignmentsPDF() {
    const assignments = window.assignmentsData || [];
    if (assignments.length === 0) {
        showToast('Raporlanacak zimmet bulunamadı', 'warning');
        return;
    }

    const columns = [
        { header: 'Malzeme', key: 'materials.name' },
        { header: 'Zimmetli', key: 'assigned_to' },
        { header: 'Unvan', key: 'target_title' },
        { header: 'Adet', key: 'quantity', style: 'width: 40px; text-align: center;' },
        { header: 'Tarih', key: 'assigned_date', style: 'width: 80px;', transform: val => new Date(val).toLocaleDateString('tr-TR') },
        { header: 'Durum', key: 'status', style: 'width: 70px;', transform: val => val === 'aktif' ? 'Aktif' : 'İade Edildi' }
    ];

    exportToPDF('Zimmet Kayıtları Raporu', assignments, columns);
}

// Export to Excel
async function downloadAssignmentsExcel() {
    const assignments = window.assignmentsData || [];
    if (assignments.length === 0) {
        showToast('Raporlanacak zimmet bulunamadı', 'warning');
        return;
    }

    const columns = [
        { header: 'Malzeme', key: 'materials.name' },
        { header: 'Marka/Model', key: 'materials.brand_model' },
        { header: 'Zimmetli Personel', key: 'assigned_to' },
        { header: 'Personel Unvanı', key: 'target_title' },
        { header: 'Kurum', key: 'institution' },
        { header: 'Bina', key: 'building' },
        { header: 'Birim', key: 'unit' },
        { header: 'Adet', key: 'quantity' },
        { header: 'Zimmet Tarihi', key: 'assigned_date', transform: val => new Date(val).toLocaleDateString('tr-TR') },
        { header: 'İade Tarihi', key: 'return_date', transform: val => val ? new Date(val).toLocaleDateString('tr-TR') : '-' },
        { header: 'Durum', key: 'status', transform: val => val === 'aktif' ? 'Aktif' : 'İade Edildi' },
        { header: 'Teslim Eden', key: 'profiles.full_name' }
    ];

    exportToExcel('Zimmet_Kayitlari', assignments, columns);
}

// Export module
window.assignmentsModule = { render };

export { render };
