// Requests Module (Talepler ve Onay Sistemi)
import { supabase, checkUserRole } from './supabase-client.js';
import { showToast, showConfirm } from './ui.js';
import { exportToPDF, exportToExcel } from './utils/export-logic.js';

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
                ${userRole !== 'depo' ? '<button class="btn btn-primary" id="add-request-btn" style="margin-right: 8px;">+ Yeni Talep</button>' : ''}
                <button class="btn btn-info" id="download-requests-pdf" style="margin-right: 8px;">📦 PDF</button>
                <button class="btn btn-success" id="download-requests-excel">📊 Excel</button>
            </div>
        </div>
        
        <div class="card">
                <div class="table-filters" style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap; width: 100%; align-items: center;">
                    <div class="search-container" style="flex: 1; min-width: 250px;">
                        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input type="text" id="search-requests" placeholder="Talep eden, malzeme veya neden ara..." class="search-input">
                    </div>
                    <select id="status-filter" class="btn btn-sm btn-secondary" style="background: var(--bg-secondary); text-align: left; min-width: 150px; height: 38px;">
                        <option value="all" ${currentFilter === 'all' ? 'selected' : ''}>Tüm Durumlar</option>
                        <option value="beklemede" ${currentFilter === 'beklemede' ? 'selected' : ''}>Beklemede</option>
                        <option value="onaylandi" ${currentFilter === 'onaylandi' ? 'selected' : ''}>Onaylandı</option>
                        <option value="tamamlandi" ${currentFilter === 'tamamlandi' ? 'selected' : ''}>Zimmetlendi</option>
                        <option value="reddedildi" ${currentFilter === 'reddedildi' ? 'selected' : ''}>Reddedildi</option>
                    </select>
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
                            <th>Talep Tarihi</th>
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
                        <div class="form-group">
                            <label for="approval-quantity">Talep Edilen Adet *</label>
                            <input type="number" id="approval-quantity" min="1" required>
                            <p class="form-help" style="font-size: 0.8rem; margin-top: 0.25rem; color: var(--text-secondary);">
                                Gerekirse adet sayısını değiştirebilirsiniz.
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

    // Store requests data
    window.requestsData = requests;

    // Event listeners
    document.getElementById('add-request-btn')?.addEventListener('click', () => openRequestModal());

    document.getElementById('search-requests')?.addEventListener('input', (e) => {
        filterRequests(e.target.value);
    });

    document.getElementById('status-filter')?.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        filterRequests(document.getElementById('search-requests').value);
    });

    document.getElementById('close-request-modal')?.addEventListener('click', closeRequestModal);
    document.getElementById('cancel-request-btn')?.addEventListener('click', closeRequestModal);
    document.getElementById('save-request-btn')?.addEventListener('click', saveRequest);

    // Approval modal events
    document.getElementById('close-approval-modal')?.addEventListener('click', closeApprovalModal);
    document.getElementById('cancel-approval-btn')?.addEventListener('click', closeApprovalModal);
    document.getElementById('confirm-approval-btn')?.addEventListener('click', confirmApproval);
    document.getElementById('download-requests-pdf')?.addEventListener('click', downloadRequestsPDF);
    document.getElementById('download-requests-excel')?.addEventListener('click', downloadRequestsExcel);

    // Assignment detail modal events
    document.getElementById('close-assignment-detail-modal')?.addEventListener('click', () => document.getElementById('assignment-detail-modal').classList.add('hidden'));
    document.getElementById('close-assignment-detail-btn')?.addEventListener('click', () => document.getElementById('assignment-detail-modal').classList.add('hidden'));

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
        const canCreateAssignment = (isAdmin || userRole === 'depo') && (r.status === 'onaylandi' || r.status === 'iade_alindi'); // 'tamamlandi' means already assigned

        return `
            <tr data-id="${r.id}">
                <td data-label="Talep Eden">${r.profiles?.full_name || 'Bilinmiyor'}</td>
                <td data-label="Malzeme Türü">
                    <div style="font-weight: 500;">${r.requested_type || 'Belirtilmemiş'}</div>
                    ${r.materials ? `<div class="text-sub">Seçilen: ${r.materials.name} [${r.materials.brand_model}]</div>` : '<div class="text-sub" style="color: var(--warning-color);">Ürün henüz seçilmedi</div>'}
                </td>
                <td data-label="Kurum/Birim">
                    <div style="font-size: 0.9rem;">${r.institution || '-'}</div>
                    <div class="text-sub">${r.building || '-'} / ${r.unit || '-'}</div>
                </td>
                <td data-label="Zimmetlenecek Kişi">
                    <div style="font-weight: 500;">${r.target_personnel || '-'}</div>
                    <div class="text-sub">${r.target_title || '-'}</div>
                </td>
                <td data-label="Adet"><span class="badge badge-info">${r.quantity}</span></td>
                <td data-label="Neden" title="${r.reason}">${r.reason.length > 30 ? r.reason.substring(0, 30) + '...' : r.reason}</td>
                <td data-label="Talep Tarihi">
                    <div style="font-size: 0.9rem;">${new Date(r.created_at).toLocaleDateString('tr-TR')}</div>
                    <div class="text-sub">${new Date(r.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td data-label="Yön. Onayı">${getApprovalBadge(r.manager_approval, r.manager_approved_at)}</td>
                <td data-label="Bşk. Onayı">${getApprovalBadge(r.president_approval, r.president_approved_at)}</td>
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
                        ${r.status === 'tamamlandi' ? `
                            <button class="btn btn-sm btn-info view-assignment-details-btn" data-id="${r.id}">Zimmetlendi</button>
                        ` : ''}
                        ${r.status === 'beklemede' && !r.manager_approval && !r.president_approval && userRole === 'personel' && r.requested_by === window.currentUser?.id ? `
                            <button class="btn btn-sm btn-danger cancel-request-btn" data-id="${r.id}">İptal</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Get approval badge
function getApprovalBadge(approval, approvalDate) {
    if (!approval) return '<span class="badge badge-warning">Bekliyor</span>';

    let dateHtml = '';
    if (approvalDate) {
        const date = new Date(approvalDate);
        dateHtml = `<div class="text-sub" style="margin-top: 0.25rem;">${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>`;
    }

    if (approval === 'onaylandi') return `<div><span class="badge badge-success">Onaylandı</span>${dateHtml}</div>`;
    if (approval === 'reddedildi') return `<div><span class="badge badge-danger">Reddedildi</span>${dateHtml}</div>`;
    return '-';
}

// Get status badge
function getStatusBadge(status) {
    const badges = {
        'beklemede': '<span class="badge badge-warning">Beklemede</span>',
        'yonetici_onayi': '<span class="badge badge-info">Yönetici Onayında</span>',
        'baskan_onayi': '<span class="badge badge-info">Başkan Onayında</span>',
        'onaylandi': '<span class="badge badge-success">Onaylandı</span>',
        'iade_alindi': '<span class="badge badge-warning" style="background: #e67e22;">İADE ALINDI</span>',
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
                ['beklemede', 'yonetici_onayi', 'baskan_onayi', 'iade_alindi'].includes(r.status)
            );
        } else if (currentFilter === 'tamamlandi') {
            filtered = filtered.filter(r => r.status === 'tamamlandi');
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

    // Sort by created_at descending (newest first)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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

    // Remove old event listener if exists
    const oldListener = typeSelect._stockCheckListener;
    if (oldListener) {
        typeSelect.removeEventListener('change', oldListener);
    }

    // Add stock check on type selection
    const stockCheckListener = async (e) => {
        const selectedType = e.target.value;
        if (!selectedType) return;

        try {
            // Check total stock for selected type
            const { data: materials, error } = await supabase
                .from('materials')
                .select('quantity')
                .eq('type', selectedType);

            if (error) {
                console.error('Stock check error:', error);
                return;
            }

            // Calculate total stock
            const totalStock = materials?.reduce((sum, m) => sum + (m.quantity || 0), 0) || 0;

            if (totalStock === 0) {
                showToast(
                    'TALEP ETTİĞİNİZ ÜRÜN DEPODA YOKTUR ANCAK TALEBİNİZ ALINACAKTIR. MALZEMENİN DEPOYA GİRİŞİ OLDUĞUNDA TALEBİNİZE DÖNÜŞ YAPILACAKTIR.',
                    'warning'
                );
            }
        } catch (err) {
            console.error('Stock check failed:', err);
        }
    };

    typeSelect._stockCheckListener = stockCheckListener;
    typeSelect.addEventListener('change', stockCheckListener);

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
    const quantityInput = document.getElementById('approval-quantity');
    const info = document.getElementById('approval-info');

    document.getElementById('approval-request-id').value = requestId;
    document.getElementById('approval-role').value = role;

    // Get current request data
    const req = window.requestsData.find(r => r.id === requestId);
    const existingId = req?.material_id;

    // Set current quantity
    quantityInput.value = req?.quantity || 1;

    info.textContent = `Talep Edilen Tür: ${requestedType}`;

    // Fetch matching materials
    const { data: materials, error } = await supabase
        .from('materials')
        .select('*')
        .eq('type', requestedType)
        .gt('quantity', 0)
        .order('name');

    if (error || !materials || materials.length === 0) {
        showToast(`${requestedType} türünde stokta uygun malzeme bulunamadı!`, 'warning');
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
    const quantity = parseInt(document.getElementById('approval-quantity').value);
    const role = document.getElementById('approval-role').value;

    if (!materialId) {
        showToast('Lütfen bir malzeme seçin', 'warning');
        return;
    }

    if (!quantity || quantity < 1) {
        showToast('Lütfen geçerli bir adet girin', 'warning');
        return;
    }

    if (role === 'manager') {
        await processManagerApproval(id, true, materialId, quantity);
    } else if (role === 'president') {
        await processPresidentApproval(id, true, materialId, quantity);
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
        showToast('Lütfen tüm alanları doldurun', 'warning');
        return;
    }

    // Role check
    if (window.currentProfile?.role === 'depo') {
        showToast('Depo görevlileri yeni talep oluşturamazlar.', 'error');
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
        showToast('Hata: ' + error.message, 'error');
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

async function processManagerApproval(id, approved, materialId = null, quantity = null) {
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

        // Update quantity if provided
        if (approved && quantity !== null) {
            updateData.quantity = quantity;
        }

        const { error } = await supabase
            .from('requests')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        window.requestsData = null; // Invalidate cache
        showToast(approved ? 'Talep onaylandı' : 'Talep reddedildi', approved ? 'success' : 'info');
        render(); // Reload

    } catch (error) {
        showToast('Hata: ' + error.message, 'error');
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

async function processPresidentApproval(id, approved, materialId = null, quantity = null) {
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

        // Update quantity if provided
        if (approved && quantity !== null) {
            updateData.quantity = quantity;
        }

        const { error } = await supabase
            .from('requests')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        window.requestsData = null; // Invalidate cache
        showToast(approved ? 'Talep onaylandı' : 'Talep reddedildi', approved ? 'success' : 'info');
        render(); // Reload

    } catch (error) {
        showToast('Hata: ' + error.message, 'error');
    }
}

// Create assignment from approved request
// Create assignment from approved request
async function createAssignmentFromRequest(requestId, materialId, quantity) {
    // Find the full request data
    const request = window.requestsData?.find(r => r.id === requestId);

    if (!request) {
        showToast('Talep bilgisi bulunamadı!', 'error');
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
    const confirmed = await showConfirm(
        'Talebi İptal Et?',
        'Bu talebi iptal etmek istediğinizden emin misiniz?',
        'Evet, İptal Et'
    );

    if (!confirmed) return;

    try {
        const { error } = await supabase
            .from('requests')
            .delete()
            .eq('id', id);

        if (error) throw error;

        window.requestsData = null; // Invalidate cache
        showToast('Talep başarıyla iptal edildi', 'success');
        render(); // Reload

    } catch (error) {
        showToast('Hata: ' + error.message, 'error');
    }
}

// View assignment details
async function viewAssignmentDetails(requestId) {
    const modal = document.getElementById('assignment-detail-modal');
    const body = document.getElementById('assignment-detail-body');

    body.innerHTML = '<div class="loading-spinner">Yükleniyor...</div>';
    modal.classList.remove('hidden');

    try {
        const { data: assignment, error } = await supabase
            .from('assignments')
            .select(`
                *,
                materials (name, brand_model, barcode, type),
                profiles!assignments_assigned_by_fkey (full_name)
            `)
            .eq('request_id', requestId)
            .order('assigned_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (!assignment) {
            body.innerHTML = '<div class="alert alert-warning">Bu talebe bağlı bir zimmet kaydı bulunamadı.</div>';
            return;
        }

        body.innerHTML = `
            <div class="detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">MALZEME</label>
                    <div style="font-weight: 500;">${assignment.materials?.name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${assignment.materials?.brand_model}</div>
                </div>
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">BARKOD</label>
                    <div style="font-weight: 500;">${assignment.materials?.barcode || '-'}</div>
                </div>
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">ZİMMETLENEN KİŞİ</label>
                    <div style="font-weight: 500;">${assignment.target_personnel}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${assignment.institution}</div>
                </div>
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">TESLİM EDEN</label>
                    <div style="font-weight: 500;">${assignment.profiles?.full_name || 'Bilinmiyor'}</div>
                </div>
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">TARİH</label>
                    <div style="font-weight: 500;">${new Date(assignment.assigned_date).toLocaleDateString('tr-TR')}</div>
                </div>
                <div class="detail-item">
                    <label style="font-weight: bold; color: var(--text-secondary); display: block; font-size: 0.8rem;">ADET</label>
                    <div style="font-weight: 500;">${assignment.quantity}</div>
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

    document.querySelectorAll('.view-assignment-details-btn').forEach(btn => {
        btn.addEventListener('click', () => viewAssignmentDetails(btn.dataset.id));
    });
}

// Export to PDF
async function downloadRequestsPDF() {
    const requests = window.requestsData || [];
    if (requests.length === 0) {
        showToast('Raporlanacak talep bulunamadı', 'warning');
        return;
    }

    const columns = [
        { header: 'Talep Eden', key: 'profiles.full_name' },
        { header: 'Malzeme Türü', key: 'requested_type' },
        { header: 'Kurum/Birim', key: 'institution', transform: (val, item) => `${val || '-'}\n${item.unit || '-'}` },
        { header: 'Adet', key: 'quantity', style: 'width: 40px; text-align: center;' },
        { header: 'Durum', key: 'status', style: 'width: 80px;', transform: val => val.toUpperCase() },
        { header: 'Tarih', key: 'created_at', style: 'width: 70px;', transform: val => new Date(val).toLocaleDateString('tr-TR') }
    ];

    exportToPDF('Malzeme Talepleri Raporu', requests, columns);
}

// Export to Excel
async function downloadRequestsExcel() {
    const requests = window.requestsData || [];
    if (requests.length === 0) {
        showToast('Raporlanacak talep bulunamadı', 'warning');
        return;
    }

    const columns = [
        { header: 'Talep Eden', key: 'profiles.full_name' },
        { header: 'Talep Edilen Malzeme Türü', key: 'requested_type' },
        { header: 'Atanan Malzeme', key: 'materials.name', transform: val => val || 'Henüz Atanmadı' },
        { header: 'Kurum', key: 'institution' },
        { header: 'Bina', key: 'building' },
        { header: 'Birim', key: 'unit' },
        { header: 'Zimmetlenecek Kişi', key: 'target_personnel' },
        { header: 'Personel Unvanı', key: 'target_title' },
        { header: 'Adet', key: 'quantity' },
        { header: 'Talep Nedeni', key: 'reason' },
        { header: 'Talep Tarihi', key: 'created_at', transform: val => new Date(val).toLocaleDateString('tr-TR') },
        { header: 'Yönetici Onayı', key: 'manager_approval', transform: val => val || 'Bekliyor' },
        { header: 'Başkan Onayı', key: 'president_approval', transform: val => val || 'Bekliyor' },
        { header: 'Genel Durum', key: 'status' }
    ];

    exportToExcel('Malzeme_Talepleri', requests, columns);
}

// Export module
window.requestsModule = { render };

export { render };
