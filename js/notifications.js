// Notifications Module
import { supabase } from './supabase-client.js';
import { showToast } from './ui.js';

let unreadCount = 0;
let notifications = [];

export async function initNotifications() {
    const user = window.currentUser;
    if (!user) return;

    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('SW Registered:', registration);

            // Request Notification Permission
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        } catch (error) {
            console.error('SW Registration failed:', error);
        }
    }

    // 2. Initial Fetch
    await fetchNotifications();

    // 3. Realtime Subscription
    supabase
        .channel('public:notifications')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            },
            (payload) => {
                handleNewNotification(payload.new);
            }
        )
        .subscribe();
}

async function fetchNotifications() {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (!error && data) {
        notifications = data;
        updateUnreadCount();
        renderNotificationList();
    }
}

function handleNewNotification(notification) {
    // Add to list
    notifications.unshift(notification);
    updateUnreadCount();
    renderNotificationList();

    // Show Toast
    showToast(notification.message, notification.type || 'info');

    // System Notification (if permission granted and document hidden)
    if (Notification.permission === 'granted' && document.hidden) {
        new Notification(notification.title, {
            body: notification.message,
            icon: '/icon-192.png'
        });
    }
}

function updateUnreadCount() {
    unreadCount = notifications.filter(n => !n.is_read).length;

    // Update Badge UI
    const badge = document.getElementById('notification-badge');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';

        // Mobile badge if separate
        const mobileBadge = document.getElementById('mobile-notification-badge');
        if (mobileBadge) {
            mobileBadge.textContent = unreadCount;
            mobileBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    }
}

async function markAsRead() {
    if (unreadCount === 0) return;

    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic Update
    notifications.forEach(n => n.is_read = true);
    updateUnreadCount();

    // DB Update
    await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
}

function renderNotificationList() {
    const container = document.getElementById('notification-list');
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">Bildirim yok</div>';
        return;
    }

    container.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.is_read ? 'read' : 'unread'}" onclick="window.notificationsModule.handleNotificationClick('${n.link || ''}')">
            <div class="notif-icon ${n.type}">
                ${getIconForType(n.type)}
            </div>
            <div class="notif-content">
                <div class="notif-title">${n.title}</div>
                <div class="notif-message">${n.message}</div>
                <div class="notif-time">${new Date(n.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        </div>
    `).join('');
}

function getIconForType(type) {
    if (type === 'success') return '✓';
    if (type === 'error') return '!';
    if (type === 'warning') return '⚠';
    return 'i';
}

// UI Toggle Logic
export function toggleNotificationPanel() {
    const panel = document.getElementById('notification-panel');
    panel.classList.toggle('hidden');

    if (!panel.classList.contains('hidden')) {
        markAsRead();
    }
}

export function handleNotificationClick(link) {
    if (link) {
        window.location.hash = link;
        // If already on the page, force reload logic might be needed, but hash change usually handles simple nav
    }
    document.getElementById('notification-panel').classList.add('hidden');
}

// Expose to window for inline calls if needed
window.notificationsModule = { initNotifications, toggleNotificationPanel, handleNotificationClick };
