// Users Management Module (Admin Only)
import { supabase, checkUserRole } from './supabase-client.js';

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
                <p>Sistem kullanıcılarını yönetin</p>
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
                            <label for="user-name">Ad Soyad *</label>
                            <input type="text" id="user-name" required>
                        </div>
                        <div class="form-group">
                            <label for="user-username">Kullanıcı Adı *</label>
                            <input type="text" id="user-username" required>
                        </div>
                        <div class="form-group" id="email-group">
                            <label for="user-email">E-posta *</label>
                            <input type="email" id="user-email" required>
                        </div>
                        <div class="form-group" id="password-group">
                            <label for="user-password">Şifre *</label>
                            <input type="password" id="user-password" required minlength="6" placeholder="En az 6 karakter">
                        </div>
                        <div class="form-group">
                            <label for="user-role">Rol *</label>
                            <select id="user-role" required>
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
            <td data-label="Kullanıcı Adı">${u.username}</td>
            <td data-label="Rol"><span class="badge badge-info">${getRoleDisplayName(u.role)}</span></td>
            <td data-label="Kayıt Tarihi">${new Date(u.created_at).toLocaleDateString('tr-TR')}</td>
            <td data-label="İşlemler">
                <div class="table-actions">
                    <button class="btn btn-sm btn-secondary edit-user-btn" data-id="${u.id}">Düzenle</button>
                    <button class="btn btn-sm btn-danger delete-user-btn" data-id="${u.id}" ${u.id === window.currentUser?.id ? 'disabled' : ''}>
                        ${u.id === window.currentUser?.id ? 'Kendinizi Silemezsiniz' : 'Sil'}
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
        if (emailGroup) emailGroup.style.display = 'none';
        if (passwordGroup) passwordGroup.style.display = 'none';
        loadUserData(userId);
    } else {
        title.textContent = 'Yeni Kullanıcı';
        document.getElementById('edit-user-id').value = '';
        if (emailGroup) emailGroup.style.display = 'block';
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

    document.getElementById('user-name').value = data.full_name;
    document.getElementById('user-username').value = data.username;
    document.getElementById('user-role').value = data.role;
}

// Close user modal
function closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
}

// Save user
async function saveUser() {
    const nameInput = document.getElementById('user-name');
    const usernameInput = document.getElementById('user-username');
    const emailInput = document.getElementById('user-email');
    const passwordInput = document.getElementById('user-password');
    const roleInput = document.getElementById('user-role');

    const name = nameInput?.value?.trim();
    const username = usernameInput?.value?.trim();
    const email = emailInput?.value?.trim();
    const password = passwordInput?.value?.trim();
    const role = roleInput?.value;

    const editId = document.getElementById('edit-user-id').value;

    if (editId) {
        // Update mode
        if (!name || !username || !role) {
            alert('Lütfen tüm yıldızlı alanları doldurun');
            return;
        }
    } else {
        // Create mode
        if (!name || !username || !email || !password || !role) {
            alert('Lütfen tüm alanları doldurun');
            return;
        }
    }

    try {
        if (editId) {
            // Update profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: name,
                    username: username,
                    role: role
                })
                .eq('id', editId);

            if (profileError) throw profileError;

            alert('Kullanıcı güncellendi!');
        } else {
            // Create mode
            // 1. Create auth user using signUp (works with anon key)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        username: username
                    }
                }
            });

            if (authError) throw authError;

            if (!authData.user) {
                throw new Error('Kullanıcı oluşturulamadı');
            }

            // 2. Create profile
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([{
                    id: authData.user.id,
                    username,
                    full_name: name,
                    role
                }]);

            if (profileError) throw profileError;
            alert('Kullanıcı başarıyla oluşturuldu!');
        }

        window.usersData = null; // Invalidate cache
        closeUserModal();
        render(); // Reload page

    } catch (error) {
        console.error('User creation error:', error);
        alert('Hata: ' + error.message);
    }
}

// Delete user
async function deleteUser(id) {
    if (id === window.currentUser?.id) {
        alert('Kendinizi silemezsiniz!');
        return;
    }

    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        // Delete profile first
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);

        if (profileError) throw profileError;

        // Delete auth user (requires service_role key - may not work with anon key)
        // This will be handled by Supabase cascade delete

        window.usersData = null; // Invalidate cache
        render(); // Reload page
        alert('Kullanıcı silindi');

    } catch (error) {
        alert('Hata: ' + error.message);
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
