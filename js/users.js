// Users Management Module (Admin Only)
import { supabase, checkUserRole } from './supabase-client.js';
import { showToast, showConfirm } from './ui.js';

const pageContent = document.getElementById('page-content');

// Render users page
async function render() {
    const isAdmin = await checkUserRole('admin');

    if (!isAdmin) {
        pageContent.innerHTML = '<div class="error">Bu sayfaya erişim yetkiniz yok.</div>';
        return;
    }

    if (!window.usersData) {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            pageContent.innerHTML = `<div class="error">Hata: ${error.message}</div>`;
            return;
        }
        window.usersData = users;
    }

    const users = window.usersData;

    pageContent.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Kullanıcı Yönetimi</h1>
            </div>
            <button class="btn btn-primary" id="add-user-btn">+ Yeni Kullanıcı</button>
        </div>
        
        <div class="card">
            <div class="card-header">
                <div class="search-container">
                    <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" id="search-users" placeholder="Kullanıcı ara..." class="search-input">
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Ad Soyad</th>
                            <th>Kullanıcı Adı</th>
                            <th>Rol</th>
                            <th>Kayıt Tarihi</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody id="users-tbody">
                        ${renderUsersTable(users)}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div id="user-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="user-modal-title">Yeni Kullanıcı</h3>
                    <button class="modal-close" id="close-user-modal">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="user-form" class="auth-form">
                        <input type="hidden" id="edit-user-id">
                        <div class="form-group">
                            <label for="modal-user-name">Ad Soyad *</label>
                            <input type="text" id="modal-user-name" required>
                        </div>
                        <div class="form-group">
                            <label for="modal-user-username">Kullanıcı Adı *</label>
                            <input type="text" id="modal-user-username" required data-no-uppercase="true" style="text-transform: lowercase;">
                        </div>
                        <div class="form-group" id="email-group">
                            <label for="modal-user-email">E-posta *</label>
                            <input type="email" id="modal-user-email" required style="text-transform: lowercase;">
                        </div>
                        <div class="form-group" id="password-group">
                            <label for="modal-user-password">Şifre *</label>
                            <input type="password" id="modal-user-password" required minlength="6" placeholder="En az 6 karakter" data-no-uppercase="true">
                        </div>
                        <div class="form-group">
                            <label for="modal-user-role">Rol *</label>
                            <select id="modal-user-role" required>
                                <option value="">Rol Seçin</option>
                                <option value="admin">Sistem Yöneticisi</option>
                                <option value="baskan">Başkan</option>
                                <option value="yonetici">Bilgi İşlem Yöneticisi</option>
                                <option value="depo">Depo Görevlisi</option>
                                <option value="personel">Personel</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-user-btn">İptal</button>
                    <button class="btn btn-primary" id="save-user-btn">Kaydet</button>
                </div>
            </div>
        </div>
        

    `;

    // Event listeners
    document.getElementById('add-user-btn')?.addEventListener('click', () => openUserModal());

    document.getElementById('search-users')?.addEventListener('input', (e) => {
        searchUsers(e.target.value, users);
    });

    document.getElementById('close-user-modal')?.addEventListener('click', closeUserModal);
    document.getElementById('cancel-user-btn')?.addEventListener('click', closeUserModal);
    document.getElementById('save-user-btn')?.addEventListener('click', saveUser);



    attachTableEventListeners();
}

// Render users table
function renderUsersTable(users) {
    if (!users || users.length === 0) {
        return '<tr><td colspan="5">Henüz kullanıcı yok</td></tr>';
    }

    return users.map(u => `
        <tr data-id="${u.id}">
            <td data-label="Ad Soyad">${u.full_name}</td>
            <td data-label="Kullanıcı Adı">${u.username.toLowerCase()}</td>
            <td data-label="Rol"><span class="badge badge-info">${getRoleDisplayName(u.role)}</span></td>
            <td data-label="Kayıt Tarihi">${new Date(u.created_at).toLocaleDateString('tr-TR')}</td>
            <td data-label="İşlemler">
                <div class="table-actions">
                    <button class="btn btn-sm btn-success edit-user-btn" data-id="${u.id}" title="Düzenle">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>

                    <button class="btn btn-sm btn-danger delete-user-btn" data-id="${u.id}" ${u.id === window.currentUser?.id ? 'disabled' : ''} title="${u.id === window.currentUser?.id ? 'Kendinizi Silemezsiniz' : 'Sil'}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Get role display name
function getRoleDisplayName(role) {
    const roleNames = {
        'admin': 'Sistem Yöneticisi',
        'baskan': 'Başkan',
        'yonetici': 'Bilgi İşlem Yöneticisi',
        'depo': 'Depo Görevlisi',
        'personel': 'Personel'
    };
    return roleNames[role] || role;
}

// Search users
function searchUsers(query, users) {
    const filtered = users.filter(u =>
        u.full_name.toLowerCase().includes(query.toLowerCase()) ||
        u.username.toLowerCase().includes(query.toLowerCase()) ||
        getRoleDisplayName(u.role).toLowerCase().includes(query.toLowerCase())
    );

    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = renderUsersTable(filtered);
    attachTableEventListeners();
}

// Open user modal
async function openUserModal(userId = null) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');
    const emailGroup = document.getElementById('email-group');
    const passwordGroup = document.getElementById('password-group');

    form.reset();

    if (userId) {
        title.textContent = 'Kullanıcı Düzenle';
        document.getElementById('edit-user-id').value = userId;
        // Show email as readonly in edit mode
        if (emailGroup) {
            emailGroup.style.display = 'block';
            const emailInput = document.getElementById('modal-user-email');
            if (emailInput) {
                emailInput.readOnly = true;
                emailInput.required = false;
            }
        }
        if (passwordGroup) passwordGroup.style.display = 'none';
        loadUserData(userId);
    } else {
        title.textContent = 'Yeni Kullanıcı';
        document.getElementById('edit-user-id').value = '';
        if (emailGroup) {
            emailGroup.style.display = 'block';
            const emailInput = document.getElementById('modal-user-email');
            if (emailInput) {
                emailInput.readOnly = false;
                emailInput.required = true;
            }
        }
        if (passwordGroup) passwordGroup.style.display = 'block';
    }

    modal.classList.remove('hidden');
}

// Load user data for edit
async function loadUserData(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error loading user data:', error);
        return;
    }

    document.getElementById('modal-user-name').value = data.full_name;
    document.getElementById('modal-user-username').value = data.username;
    document.getElementById('modal-user-role').value = data.role;

    // Get email from auth.users (using admin API)
    // Since we can't directly access auth.users, we'll use username as email
    // In most cases, username IS the email
    const emailInput = document.getElementById('modal-user-email');
    if (emailInput) {
        emailInput.value = data.username; // Username is the email
    }
}

// Close user modal
function closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
}

// Save user
async function saveUser() {
    const nameInput = document.getElementById('modal-user-name');
    const usernameInput = document.getElementById('modal-user-username');
    const emailInput = document.getElementById('modal-user-email');
    const passwordInput = document.getElementById('modal-user-password');
    const roleInput = document.getElementById('modal-user-role');

    console.log('Input elements:', {
        nameInput: nameInput?.value,
        usernameInput: usernameInput?.value,
        emailInput: emailInput?.value,
        roleInput: roleInput?.value
    });

    const name = nameInput?.value?.trim();
    const username = usernameInput?.value?.trim().toLowerCase();
    const email = emailInput?.value?.trim().toLowerCase();
    const password = passwordInput?.value?.trim();
    const role = roleInput?.value;

    console.log('Processed values:', { name, username, email, role });

    const editId = document.getElementById('edit-user-id').value;

    if (editId) {
        // Update mode
        if (!name || !username || !role) {
            showToast('Lütfen tüm yıldızlı alanları doldurun', 'warning');
            return;
        }
    } else {
        // Create mode
        if (!name || !username || !email || !password || !role) {
            showToast('Lütfen tüm alanları doldurun', 'warning');
            return;
        }
    }

    try {
        const saveBtn = document.getElementById('save-user-btn');

        if (editId) {
            // Update profile
            console.log('Updating user:', { editId, name, username, role });

            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: name,
                    username: username.toLowerCase(),
                    role: role
                })
                .eq('id', editId);

            if (profileError) {
                console.error('Profile update error:', profileError);
                throw profileError;
            }

            showToast('Kullanıcı güncellendi!', 'success');
        } else {
            // Create mode - Disable button to prevent rapid clicks
            saveBtn.disabled = true;
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Oluşturuluyor...';

            // 1. Create auth user using signUp (works with anon key)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email.toLowerCase(),
                password,
                options: {
                    data: {
                        full_name: name,
                        username: username.toLowerCase()
                    }
                }
            });

            if (authError) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;

                // Better error message for rate limiting
                if (authError.message.includes('For security purposes')) {
                    throw new Error('Çok hızlı kullanıcı oluşturma denemesi. Lütfen 20 saniye bekleyip tekrar deneyin.');
                }
                throw authError;
            }

            if (!authData.user) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
                throw new Error('Kullanıcı oluşturulamadı');
            }

            // 2. Create profile
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([{
                    id: authData.user.id,
                    username: username.toLowerCase(),
                    full_name: name,
                    role
                }]);

            if (profileError) throw profileError;
            showToast('Kullanıcı başarıyla oluşturuldu!', 'success');
        }

        window.usersData = null; // Invalidate cache
        closeUserModal();
        render(); // Reload page

    } catch (error) {
        console.error('User creation error:', error);
        showToast('Hata: ' + error.message, 'error');
    }
}

// Delete user
async function deleteUser(id) {
    if (id === window.currentUser?.id) {
        showToast('Kendinizi silemezsiniz!', 'error');
        return;
    }

    const user = (window.usersData || []).find(u => u.id === id);
    const userName = user ? user.full_name : 'bu kullanıcıyı';

    const confirmed = await showConfirm(
        'Kullanıcıyı Sil?',
        `${userName} isimli kullanıcıyı silmek istediğinizden emin misiniz?`,
        'Evet, Sil'
    );

    if (!confirmed) return;

    try {
        // Delete profile first
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);

        if (profileError) throw profileError;

        window.usersData = null; // Invalidate cache
        render(); // Reload page
        showToast('Kullanıcı silindi', 'success');

    } catch (error) {
        showToast('Hata: ' + error.message, 'error');
    }
}

// Attach event listeners
function attachTableEventListeners() {
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openUserModal(btn.dataset.id);
        });
    });



    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        if (!btn.disabled) {
            btn.addEventListener('click', () => {
                deleteUser(btn.dataset.id);
            });
        }
    });
}



// Export module
window.usersModule = { render };

export { render };
