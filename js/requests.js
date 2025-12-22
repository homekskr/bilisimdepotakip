// Requests Module (Talepler ve Onay Sistemi)
import { supabase, checkUserRole } from './supabase-client.js';

const pageContent = document.getElementById('page-content');

// Render requests page
async function render() {
    const userRole = window.currentProfile?.role;
    const userId = window.currentUser?.id;

    // Always fetch fresh data for the full requests page to avoid partial data from dashboard cache
    let query = supabase
        .from('requests')
        .select(`
            *,
            materials (name, type, brand_model, quantity),
            profiles!requests_requested_by_fkey (full_name),
            manager_profile:profiles!requests_manager_approved_by_fkey (full_name),
            president_profile:profiles!requests_president_approved_by_fkey (full_name)
        `)
        .order('created_at', { ascending: false });

    // Personel can only see their own requests, unless they are admin
    if (userRole === 'personel' && userRole !== 'admin') {
        query = query.eq('requested_by', userId);
    }

    const { data: requests, error } = await query;

    if (error) {
        pageContent.innerHTML = `<div class="error">Hata: ${error.message}</div>`;
        return;
    }

    // Update global cache with full data
    window.requestsData = requests;

    pageContent.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Talepler</h1>
                <p>Malzeme talepleri ve onay süreçleri</p>
            </div>
            <button class="btn btn-primary" id="add-request-btn">+ Yeni Talep</button>
        </div>
        
        <div class="card">
            <div class="card-header">
                <div class="search-container">
                    <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" id="search-requests" placeholder="Talep eden, malzeme veya neden ara..." class="search-input">
                </div>
                <div>
                    <button class="btn btn-sm ${currentFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" data-filter="all">Tümü</button>
                    <button class="btn btn-sm ${currentFilter === 'beklemede' ? 'btn-primary' : 'btn-secondary'}" data-filter="beklemede">Beklemede</button>
                    <button class="btn btn-sm ${currentFilter === 'onaylandi' ? 'btn-primary' : 'btn-secondary'}" data-filter="onaylandi">Onaylandı</button>
                    <button class="btn btn-sm ${currentFilter === 'reddedildi' ? 'btn-primary' : 'btn-secondary'}" data-filter="reddedildi">Reddedildi</button>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Talep Eden</th>
                            <th>Malzeme</th>
                            <th>Kurum/Birim</th>
                            <th>Zimmetlenecek Kişi</th>
                            <th>Adet</th>
                            <th>Neden</th>
                            <th>Yönetici Onayı</th>
                            <th>Başkan Onayı</th>
                            <th>Durum</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody id="requests-tbody">
                        ${renderRequestsTable(requests, userRole)}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Add Request Modal -->
        <div id="request-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Yeni Talep</h3>
                    <button class="modal-close" id="close-request-modal">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="request-form" class="auth-form">
                        <div class="form-group">
                            <label for="request-type">Talep Edilen Malzeme Türü *</label>
                            <select id="request-type" required></select>
                        </div>
                        <div class="form-group">
                            <label for="request-institution">Kurum *</label>
                            <select id="request-institution" required>
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
                            <label for="request-building">Bina *</label>
                            <select id="request-building" required>
                                <option value="">Bina Seçiniz</option>
                                <option value="ANA HİZMET BİNASI">ANA HİZMET BİNASI</option>
                                <option value="EK HİZMET BİNASI">EK HİZMET BİNASI</option>
                                <option value="HALK SAĞLIĞI EK HİZMET BİNASI">HALK SAĞLIĞI EK HİZMET BİNASI</option>
                                <option value="SAĞLIK HİZMETLERİ EK HİZMET BİNASI">SAĞLIK HİZMETLERİ EK HİZMET BİNASI</option>
                                <option value="DESTEK HİZMETLERİ EK HİZMET BİNASI">DESTEK HİZMETLERİ EK HİZMET BİNASI</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="request-unit">Birim *</label>
                            <input type="text" id="request-unit" required placeholder="Örn: Bilgi İşlem">
                        </div>
                        <div class="form-group">
                            <label for="request-personnel">Talep Eden Personel *</label>
                            <input type="text" id="request-personnel" required placeholder="Adı Soyadı">
                        </div>
                        <div class="form-group">
                            <label for="request-title">Personel Ünvanı *</label>
                            <input type="text" id="request-title" required placeholder="Örn: Mühendis">
                        </div>
                        <div class="form-group">
                            <label for="request-quantity">Adet *</label>
                            <input type="number" id="request-quantity" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="request-reason">Talep Nedeni *</label>
                            <textarea id="request-reason" rows="3" required placeholder="Malzeme talep nedeninizi açıklayın"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-request-btn">İptal</button>
                    <button class="btn btn-primary" id="save-request-btn">Talep Oluştur</button>
                </div>
            </div>
        </div>
        
        <!-- Approval & Material Selection Modal -->
        <div id="approval-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="approval-modal-title">Talep Onaylama</h3>
                    <button class="modal-close" id="close-approval-modal">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <p id="approval-info" style="margin-bottom: 1rem; color: var(--text-secondary);"></p>
                    <form id="approval-form" class="auth-form">
                        <input type="hidden" id="approval-request-id">
                        <input type="hidden" id="approval-role">
                        <div class="form-group" id="approval-material-group">
                            <label for="approval-material-select">Atanacak Malzeme *</label>
                            <select id="approval-material-select" required>
                                <option value="">Stoktan Malzeme Seçin</option>
                            </select>
                            <p class="form-help" style="font-size: 0.8rem; margin-top: 0.25rem; color: var(--text-secondary);">
                                Sadece stokta bulunan ve talep edilen türe uygun malzemeler listelenir.
                            </p>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-approval-btn">İptal</button>
                    <button class="btn btn-success" id="confirm-approval-btn">Onayla ve Eşleştir</button>
                </div>
            </div>
        </div>
    `;

    // Store requests data
    window.requestsData = requests;

    // Event listeners
    document.getElementById('add-request-btn')?.addEventListener('click', () => openRequestModal());

    document.getElementById('search-requests')?.addEventListener('input', (e) => {
        filterRequests(e.target.value);
    });

    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            filterRequests(document.getElementById('search-requests').value);

            // Update button styles
            document.querySelectorAll('[data-filter]').forEach(b => {
                b.className = b.dataset.filter === currentFilter ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
            });
        });
    });

    document.getElementById('close-request-modal')?.addEventListener('click', closeRequestModal);
    document.getElementById('cancel-request-btn')?.addEventListener('click', closeRequestModal);
    document.getElementById('save-request-btn')?.addEventListener('click', saveRequest);

    // Approval modal events
    document.getElementById('close-approval-modal')?.addEventListener('click', closeApprovalModal);
    document.getElementById('cancel-approval-btn')?.addEventListener('click', closeApprovalModal);
    document.getElementById('confirm-approval-btn')?.addEventListener('click', confirmApproval);

    attachTableEventListeners();
}

let currentFilter = 'all';

// Render requests table
function renderRequestsTable(requests, userRole) {
    if (!requests || requests.length === 0) {
        return '<tr><td colspan="8">Henüz talep yok</td></tr>';
    }

    return requests.map(r => {
        const isAdmin = userRole === 'admin';
        const canApproveAsManager = (isAdmin || userRole === 'yonetici') && r.status === 'beklemede' && !r.manager_approval;
        const canApproveAsPresident = (isAdmin || userRole === 'baskan') && r.manager_approval === 'onaylandi' && !r.president_approval;
        const canCreateAssignment = (isAdmin || userRole === 'depo') && r.status === 'onaylandi'; // 'tamamlandi' means already assigned

        return `
            <tr data-id="${r.id}">
                <td data-label="Talep Eden">${r.profiles?.full_name || 'Bilinmiyor'}</td>
                <td data-label="Malzeme Türü">
                    <div style="font-weight: 500;">${r.requested_type || 'Belirtilmemiş'}</div>
                    ${r.materials ? `<div style="font-size: 0.85rem; color: var(--text-secondary);">Seçilen: ${r.materials.name} [${r.materials.brand_model}]</div>` : '<div style="font-size: 0.8rem; color: var(--warning-color);">Ürün henüz seçilmedi</div>'}
                </td>
                <td data-label="Kurum/Birim">
                    <div style="font-size: 0.9rem;">${r.institution || '-'}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${r.building || '-'} / ${r.unit || '-'}</div>
                </td>
                <td data-label="Zimmetlenecek Kişi">
                    <div style="font-weight: 500;">${r.target_personnel || '-'}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${r.target_title || '-'}</div>
                </td>
                <td data-label="Adet"><span class="badge badge-info">${r.quantity}</span></td>
                <td data-label="Neden" title="${r.reason}">${r.reason.length > 30 ? r.reason.substring(0, 30) + '...' : r.reason}</td>
                <td data-label="Yön. Onayı">${getApprovalBadge(r.manager_approval)}</td>
                <td data-label="Bşk. Onayı">${getApprovalBadge(r.president_approval)}</td>
                <td data-label="Durum">${getStatusBadge(r.status)}</td>
                <td data-label="İşlemler">
                    <div class="table-actions">
                        ${canApproveAsManager ? `
                            <button class="btn btn-sm btn-success approve-manager-btn" data-id="${r.id}" data-type="${r.requested_type}">Seç ve Onayla</button>
                            <button class="btn btn-sm btn-danger reject-manager-btn" data-id="${r.id}">Reddet</button>
                        ` : ''}
                        ${canApproveAsPresident ? `
                            <button class="btn btn-sm btn-success approve-president-btn" data-id="${r.id}">Onayla</button>
                            <button class="btn btn-sm btn-danger reject-president-btn" data-id="${r.id}">Reddet</button>
                        ` : ''}
                        ${canCreateAssignment ? `
                            <button class="btn btn-sm btn-primary create-assignment-btn" data-id="${r.id}" data-material="${r.material_id}" data-quantity="${r.quantity}">Zimmet Çıkışı</button>
                        ` : ''}
                        ${r.status === 'beklemede' && userRole === 'personel' && r.requested_by === window.currentUser?.id ? `
                            <button class="btn btn-sm btn-danger cancel-request-btn" data-id="${r.id}">İptal</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Get approval badge
function getApprovalBadge(approval) {
    if (!approval) return '<span class="badge badge-warning">Bekliyor</span>';
    if (approval === 'onaylandi') return '<span class="badge badge-success">Onaylandı</span>';
    if (approval === 'reddedildi') return '<span class="badge badge-danger">Reddedildi</span>';
    return '-';
}

// Get status badge
function getStatusBadge(status) {
    const badges = {
        'beklemede': '<span class="badge badge-warning">Beklemede</span>',
        'yonetici_onayi': '<span class="badge badge-info">Yönetici Onayında</span>',
        'baskan_onayi': '<span class="badge badge-info">Başkan Onayında</span>',
        'onaylandi': '<span class="badge badge-success">Onaylandı</span>',
        'tamamlandi': '<span class="badge badge-success" style="background: var(--success-color); filter: brightness(0.9);">Zimmetlendi</span>',
        'reddedildi': '<span class="badge badge-danger">Reddedildi</span>'
    };
    return badges[status] || status;
}

// Filter requests
function filterRequests(query) {
    let filtered = window.requestsData || [];

    // Filter by status
    if (currentFilter !== 'all') {
        if (currentFilter === 'beklemede') {
            filtered = filtered.filter(r =>
                ['beklemede', 'yonetici_onayi', 'baskan_onayi'].includes(r.status)
            );
        } else {
            filtered = filtered.filter(r => r.status === currentFilter);
        }
    }

    // Filter by search query
    if (query) {
        filtered = filtered.filter(r =>
            r.materials?.name.toLowerCase().includes(query.toLowerCase()) ||
            (r.requested_type && r.requested_type.toLowerCase().includes(query.toLowerCase())) ||
            r.profiles?.full_name.toLowerCase().includes(query.toLowerCase()) ||
            r.reason.toLowerCase().includes(query.toLowerCase())
        );
    }

    const userRole = window.currentProfile?.role;
    const tbody = document.getElementById('requests-tbody');
    tbody.innerHTML = renderRequestsTable(filtered, userRole);
    attachTableEventListeners();
}

// Open request modal
async function openRequestModal() {
    const modal = document.getElementById('request-modal');
    const typeSelect = document.getElementById('request-type');

    // Predefined types list (to ensure consistency)
    const materialTypes = [
        "MASAÜSTÜ BİLGİSAYAR", "DİZÜSTÜ BİLGİSAYAR", "EKRAN LCD/LED", "YAZICI DÜZ",
        "YAZICI ÇOK FONKSİYONLU", "BARKOD YAZICI", "TARAYICI", "SUNUCU BİLGİSAYAR",
        "VERİ DEPOLAMA ÜNİTESİ", "ANAHTARLAMA CİHAZI", "ACCESS POINT", "KLAVYE", "MOUSE", "DİĞER"
    ];

    typeSelect.innerHTML = '<option value="">Talep Türü Seçin</option>' +
        materialTypes.map(t => `<option value="${t}">${t}</option>`).join('');

    document.getElementById('request-form').reset();
    modal.classList.remove('hidden');
}

// Close request modal
function closeRequestModal() {
    document.getElementById('request-modal').classList.add('hidden');
}

// Approval Modal Functions
async function openApprovalModal(requestId, requestedType, role) {
    const modal = document.getElementById('approval-modal');
    const select = document.getElementById('approval-material-select');
    const info = document.getElementById('approval-info');

    document.getElementById('approval-request-id').value = requestId;
    document.getElementById('approval-role').value = role;

    info.textContent = `Talep Edilen Tür: ${requestedType}`;

    // Get current selection if any
    const req = window.requestsData.find(r => r.id === requestId);
    const existingId = req?.material_id;

    // Fetch matching materials
    const { data: materials, error } = await supabase
        .from('materials')
        .select('*')
        .eq('type', requestedType)
        .gt('quantity', 0)
        .order('name');

    if (error || !materials || materials.length === 0) {
        alert(`${requestedType} türünde stokta uygun malzeme bulunamadı!`);
        return;
    }

    select.innerHTML = '<option value="">Stoktan Ürün Seçiniz</option>' +
        materials.map(m => `<option value="${m.id}" ${m.id === existingId ? 'selected' : ''}>${m.name} [${m.condition || 'YENİ'}] - ${m.brand_model} (Stok: ${m.quantity})</option>`).join('');

    modal.classList.remove('hidden');
}

function closeApprovalModal() {
    document.getElementById('approval-modal').classList.add('hidden');
}

async function confirmApproval() {
    const id = document.getElementById('approval-request-id').value;
    const materialId = document.getElementById('approval-material-select').value;
    const role = document.getElementById('approval-role').value;

    if (!materialId) {
        alert('Lütfen bir malzeme seçin');
        return;
    }

    if (role === 'manager') {
        await processManagerApproval(id, true, materialId);
    } else if (role === 'president') {
        await processPresidentApproval(id, true, materialId);
    }

    closeApprovalModal();
}

// Save request
async function saveRequest() {
    const requestedType = document.getElementById('request-type').value;
    const institution = document.getElementById('request-institution').value;
    const building = document.getElementById('request-building').value;
    const unit = document.getElementById('request-unit').value;
    const personnel = document.getElementById('request-personnel').value;
    const title = document.getElementById('request-title').value;
    const quantity = parseInt(document.getElementById('request-quantity').value);
    const reason = document.getElementById('request-reason').value;

    if (!requestedType || !institution || !building || !unit || !personnel || !title || !quantity || !reason) {
        alert('Lütfen tüm alanları doldurun');
        return;
    }

    try {
        const { error } = await supabase
            .from('requests')
            .insert([{
                requested_type: requestedType,
                requested_by: window.currentUser.id,
                institution: institution,
                building: building,
                unit: unit,
                target_personnel: personnel,
                target_title: title,
                quantity: quantity,
                reason: reason,
                status: 'beklemede'
            }]);

        if (error) throw error;

        window.requestsData = null; // Invalidate cache
        closeRequestModal();
        render(); // Reload

    } catch (error) {
        alert('Hata: ' + error.message);
    }
}

// Approve as manager
async function approveAsManager(id, approved, requestedType = null) {
    if (!approved) {
        await processManagerApproval(id, false);
        return;
    }
    openApprovalModal(id, requestedType, 'manager');
}

async function processManagerApproval(id, approved, materialId = null) {
    try {
        const updateData = {
            manager_approval: approved ? 'onaylandi' : 'reddedildi',
            manager_approved_by: window.currentUser.id,
            manager_approved_at: new Date().toISOString(),
            status: approved ? (approved === true ? 'yonetici_onayi' : 'reddedildi') : 'reddedildi'
        };

        if (approved && materialId) {
            updateData.material_id = materialId;
            updateData.status = 'yonetici_onayi';
        }

        const { error } = await supabase
            .from('requests')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        window.requestsData = null; // Invalidate cache
        render(); // Reload

    } catch (error) {
        alert('Hata: ' + error.message);
    }
}

// Approve as president
async function approveAsPresident(id, approved, requestedType = null) {
    if (!approved) {
        await processPresidentApproval(id, false);
        return;
    }

    // Always open modal for president to see/confirm selection
    openApprovalModal(id, requestedType, 'president');
}

async function processPresidentApproval(id, approved, materialId = null) {
    try {
        const updateData = {
            president_approval: approved ? 'onaylandi' : 'reddedildi',
            president_approved_by: window.currentUser.id,
            president_approved_at: new Date().toISOString(),
            status: approved ? 'onaylandi' : 'reddedildi'
        };

        if (approved && materialId) {
            updateData.material_id = materialId;
        }

        const { error } = await supabase
            .from('requests')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        window.requestsData = null; // Invalidate cache
        render(); // Reload

    } catch (error) {
        alert('Hata: ' + error.message);
    }
}

// Create assignment from approved request
// Create assignment from approved request
async function createAssignmentFromRequest(requestId, materialId, quantity) {
    // Find the full request data
    const request = window.requestsData?.find(r => r.id === requestId);

    if (!request) {
        alert('Talep bilgisi bulunamadı!');
        return;
    }

    // Prepare prefill data
    window.assignmentPrefillData = {
        materialId: materialId,
        quantity: quantity,
        institution: request.institution,
        building: request.building,
        unit: request.unit,
        personnel: request.target_personnel,
        title: request.target_title,
        requestId: requestId // To link back if needed
    };

    // Navigate to assignments page
    window.navigateTo('assignments');
}

// Cancel request
async function cancelRequest(id) {
    if (!confirm('Bu talebi iptal etmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('requests')
            .delete()
            .eq('id', id);

        if (error) throw error;

        render(); // Reload

    } catch (error) {
        alert('Hata: ' + error.message);
    }
}

// Attach event listeners
function attachTableEventListeners() {
    document.querySelectorAll('.approve-manager-btn').forEach(btn => {
        btn.addEventListener('click', () => approveAsManager(btn.dataset.id, true, btn.dataset.type));
    });

    document.querySelectorAll('.reject-manager-btn').forEach(btn => {
        btn.addEventListener('click', () => approveAsManager(btn.dataset.id, false));
    });

    document.querySelectorAll('.approve-president-btn').forEach(btn => {
        const req = window.requestsData.find(r => r.id === btn.dataset.id);
        btn.addEventListener('click', () => approveAsPresident(btn.dataset.id, true, req?.requested_type));
    });

    document.querySelectorAll('.reject-president-btn').forEach(btn => {
        btn.addEventListener('click', () => approveAsPresident(btn.dataset.id, false));
    });

    document.querySelectorAll('.create-assignment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            createAssignmentFromRequest(btn.dataset.id, btn.dataset.material, parseInt(btn.dataset.quantity));
        });
    });

    document.querySelectorAll('.cancel-request-btn').forEach(btn => {
        btn.addEventListener('click', () => cancelRequest(btn.dataset.id));
    });
}

// Export module
window.requestsModule = { render };

export { render };
