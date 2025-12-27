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
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    await subscribeToPush(registration);
                }
            } else if (Notification.permission === 'granted') {
                await subscribeToPush(registration);
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

// VAPID Public Key (from generated keys)
const VAPID_PUBLIC_KEY = 'BPVBuZN7-1kproJaPnFnB134NbrgHRPju3ox36PoPKW2hgu5ESP5L7j5xc0qy_9k4u5qJQbZAAI44N72IzLShsA';

async function subscribeToPush(registration) {
    try {
        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Subscribe to push
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            console.log('Push subscription created:', subscription);
        }

        // Save subscription to database
        await savePushSubscription(subscription);
    } catch (error) {
        console.error('Push subscription failed:', error);
    }
}

async function savePushSubscription(subscription) {
    const user = window.currentUser;
    if (!user) return;

    const subscriptionData = {
        user_id: user.id,
        endpoint: subscription.endpoint,
        keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64(subscription.getKey('auth'))
        }
    };

    const { error } = await supabase
        .from('push_subscriptions')
        .upsert(subscriptionData, {
            onConflict: 'user_id,endpoint'
        });

    if (error) {
        console.error('Error saving push subscription:', error);
    } else {
        console.log('Push subscription saved successfully');
    }
}

// Helper functions for encoding
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
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

    // Add "Clear All" button at the top
    const clearButton = notifications.filter(n => n.is_read).length > 0
        ? `<div style="padding: 0.5rem; text-align: right; border-bottom: 1px solid var(--glass-border);">
             <button onclick="window.notificationsModule.clearAllRead()" style="
                 background: var(--danger);
                 color: white;
                 border: none;
                 padding: 0.4rem 0.8rem;
                 border-radius: 6px;
                 cursor: pointer;
                 font-size: 0.85rem;
                 transition: opacity 0.2s;
             " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                 Okunanları Temizle
             </button>
           </div>`
        : '';

    container.innerHTML = clearButton + notifications.map(n => `
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
        // Remove # if present
        const page = link.replace(/^#/, '');

        // Use the global navigateTo function from app.js
        if (typeof window.navigateTo === 'function') {
            window.navigateTo(page);
        } else {
            // Fallback for direct hash change
            window.location.hash = page;
        }
    }

    // Close panel
    const panel = document.getElementById('notification-panel');
    if (panel) {
        panel.classList.add('hidden');
    }
}

export async function clearAllRead() {
    const readNotifications = notifications.filter(n => n.is_read);
    if (readNotifications.length === 0) {
        showToast('Temizlenecek okunmuş bildirim yok', 'info');
        return;
    }

    const readIds = readNotifications.map(n => n.id);

    // Optimistic update
    notifications = notifications.filter(n => !n.is_read);
    renderNotificationList();

    // Delete from database
    const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', readIds);

    if (error) {
        console.error('Error deleting notifications:', error);
        showToast('Bildirimler temizlenirken hata oluştu', 'error');
        // Revert on error
        await fetchNotifications();
    } else {
        showToast(`${readIds.length} bildirim temizlendi`, 'success');
    }
}

// Expose to window for inline calls if needed
window.notificationsModule = { initNotifications, toggleNotificationPanel, handleNotificationClick, clearAllRead };
