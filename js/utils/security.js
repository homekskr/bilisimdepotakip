/**
 * Security utilities for the application
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} unsafe The string to escape
 * @returns {string} The escaped string
 */
export function escapeHTML(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    if (typeof unsafe !== 'string') unsafe = String(unsafe);

    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
