// Assignments Module (Zimmetler)
import { supabase, checkUserRole } from './supabase-client.js';

const pageContent = document.getElementById('page-content');

// Render assignments page
async function render() {
    const canManage = await checkUserRole(['admin', 'depo']);

    // Fetch assignments with related data (using cache)
    if (!window.assignmentsData) {
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
            pageContent.innerHTML = `<div class="error">Hata: ${error.message}</div>`;
            return;
        }
        window.assignmentsData = assignments;
    }

    const assignments = window.assignmentsData;

    pageContent.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Zimmetler</h1>
                <p>Malzeme zimmet kayıtları</p>
            </div>
            ${canManage ? '<button class="btn btn-primary" id="add-assignment-btn">+ Yeni Zimmet</button>' : ''}
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

    document.getElementById('close-assignment-modal')?.addEventListener('click', closeAssignmentModal);
    document.getElementById('cancel-assignment-btn')?.addEventListener('click', closeAssignmentModal);
    document.getElementById('save-assignment-btn')?.addEventListener('click', saveAssignment);

    attachTableEventListeners();
}

let currentFilter = 'all';

// Render assignments table
function renderAssignmentsTable(assignments, canManage) {
    if (!assignments || assignments.length === 0) {
        return '<tr><td colspan="7">Henüz zimmet kaydı yok</td></tr>';
    }

    return assignments.map(a => `
        <tr data-id="${a.id}">
            <td data-label="Malzeme">${a.materials?.name || 'Bilinmiyor'}</td>
            <td data-label="Zimmetli">${a.assigned_to}</td>
            <td data-label="Adet"><span class="badge badge-info">${a.quantity}</span></td>
            <td data-label="Zimmet Tarihi">${new Date(a.assigned_date).toLocaleDateString('tr-TR')}</td>
            <td data-label="İade Tarihi">${a.return_date ? new Date(a.return_date).toLocaleDateString('tr-TR') : '-'}</td>
            <td data-label="Durum"><span class="badge ${a.status === 'aktif' ? 'badge-success' : 'badge-warning'}">${a.status === 'aktif' ? 'Aktif' : 'İade Edildi'}</span></td>
            ${canManage ? `
                <td data-label="İşlemler">
                    <div class="table-actions">
                        ${a.status === 'aktif' ? `<button class="btn btn-sm btn-warning return-assignment-btn" data-id="${a.id}">İade Al</button>` : ''}
                    </div>
                </td>
            ` : ''}
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

    const canManage = ['admin', 'depo'].includes(window.currentProfile?.role);
    const tbody = document.getElementById('assignments-tbody');
    tbody.innerHTML = renderAssignmentsTable(filtered, canManage);
    attachTableEventListeners();
}

// Open assignment modal
async function openAssignmentModal() {
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
    modal.classList.remove('hidden');
}

// Close assignment modal
function closeAssignmentModal() {
    document.getElementById('assignment-modal').classList.add('hidden');
}

// Save assignment
async function saveAssignment() {
    const materialId = document.getElementById('assignment-material').value;
    const institution = document.getElementById('assignment-institution').value;
    const building = document.getElementById('assignment-building').value;
    const unit = document.getElementById('assignment-unit').value;
    const personnel = document.getElementById('assignment-personnel').value;
    const title = document.getElementById('assignment-title').value;
    const quantity = parseInt(document.getElementById('assignment-quantity').value);

    if (!materialId || !institution || !building || !unit || !personnel || !title || !quantity) {
        alert('Lütfen tüm alanları doldurun');
        return;
    }

    // Check stock
    const { data: material } = await supabase
        .from('materials')
        .select('quantity')
        .eq('id', materialId)
        .single();

    if (material.quantity < quantity) {
        alert('Yetersiz stok! Mevcut: ' + material.quantity);
        return;
    }

    try {
        // Create assignment
        const { error: assignError } = await supabase
            .from('assignments')
            .insert([{
                material_id: materialId,
                assigned_to: personnel, // Backend column stays same or updated
                institution: institution,
                building: building,
                unit: unit,
                target_personnel: personnel,
                target_title: title,
                quantity: quantity,
                assigned_by: window.currentUser.id,
                status: 'aktif'
            }]);

        if (assignError) throw assignError;

        // Update material quantity
        const { error: updateError } = await supabase
            .from('materials')
            .update({ quantity: material.quantity - quantity })
            .eq('id', materialId);

        if (updateError) throw updateError;

        window.assignmentsData = null; // Invalidate cache
        window.materialsData = null; // Also invalidate materials cache as quantity changed
        closeAssignmentModal();
        render(); // Reload

    } catch (error) {
        alert('Hata: ' + error.message);
    }
}

// Return assignment
async function returnAssignment(id) {
    if (!confirm('Bu zimmeti iade almak istediğinizden emin misiniz?')) {
        return;
    }

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

        window.assignmentsData = null; // Invalidate cache
        window.materialsData = null; // Also invalidate materials cache
        render(); // Reload

    } catch (error) {
        alert('Hata: ' + error.message);
    }
}

// Attach event listeners
function attachTableEventListeners() {
    document.querySelectorAll('.return-assignment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            returnAssignment(btn.dataset.id);
        });
    });
}

// Export module
window.assignmentsModule = { render };

export { render };
