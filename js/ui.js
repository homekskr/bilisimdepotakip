/**
 * UI & Notifications Helper Module
 * Provides modern toast notifications and custom confirmation dialogs
 */

// Create toast container if it doesn't exist
function getToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Show a modern toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration - Milliseconds to show
 */
export function showToast(message, type = 'info', duration = 3000) {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Choose icon based on type
    let icon = '';
    switch (type) {
        case 'success': icon = '✅'; break;
        case 'error': icon = '❌'; break;
        case 'warning': icon = '⚠️'; break;
        case 'info': icon = 'ℹ️'; break;
    }

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('fadeOut');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, duration);
}

/**
 * Show a modern custom confirmation modal
 * @param {string} title - Modal title
 * @param {string} text - Description/Question
 * @param {string} confirmText - Label for confirm button
 * @returns {Promise<boolean>}
 */
export function showConfirm(title = 'Emin misiniz?', text = 'Bu işlem geri alınamaz.', confirmText = 'Evet, Sil') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-modal-overlay';

        overlay.innerHTML = `
            <div class="confirm-modal">
                <div class="confirm-modal-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
                    </svg>
                </div>
                <h3 class="confirm-modal-title">${title}</h3>
                <p class="confirm-modal-text">${text}</p>
                <div class="confirm-modal-actions">
                    <button class="btn btn-secondary" id="confirm-cancel">Vazgeç</button>
                    <button class="btn btn-danger" id="confirm-ok">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const cancelBtn = overlay.querySelector('#confirm-cancel');
        const okBtn = overlay.querySelector('#confirm-ok');

        cancelBtn.onclick = () => {
            overlay.remove();
            resolve(false);
        };

        okBtn.onclick = () => {
            overlay.remove();
            resolve(true);
        };

        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        };
    });
}
